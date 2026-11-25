"use server";

import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { refresh } from "next/cache";
import { connectDB } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { monthIndex } from "@/lib/ledger";
import { requireAdmin } from "@/lib/session";
import { Student } from "@/lib/models/Student";
import { FeeRecord } from "@/lib/models/FeeRecord";
import {
  amount,
  firstError,
  formValues,
  isoDate,
  optionalText,
  positiveAmount,
  requiredText,
} from "@/lib/validation";

const objectId = (label) => z.string().refine(isValidObjectId, `Invalid ${label}.`);

const paymentSchema = z.object({
  student: objectId("student"),
  target: z.string().regex(/^(monthly|record:[a-f\d]{24})$/i, "Choose what the payment is for."),
  month: z.string().optional().default(""),
  amount: positiveAmount,
  paidOn: isoDate,
  note: optionalText(200),
});

const otherFeeSchema = z
  .object({
    student: objectId("student"),
    description: requiredText("Description"),
    amountDue: positiveAmount,
    paidNow: amount,
    paidOn: isoDate,
  })
  .refine((v) => v.paidNow <= v.amountDue, {
    message: "Amount paid now cannot exceed the fee amount.",
  });

// Adds a payment only if it keeps amountPaid <= amountDue, atomically.
async function pushPayment(filter, payment) {
  const result = await FeeRecord.updateOne(
    { ...filter, $expr: { $lte: [{ $add: ["$amountPaid", payment.amount] }, "$amountDue"] } },
    { $push: { payments: payment }, $inc: { amountPaid: payment.amount } },
  );
  if (result.modifiedCount === 1) return null;

  const record = await FeeRecord.findOne(filter).select("amountDue amountPaid").lean();
  if (!record) return "Fee record not found.";
  const remaining = record.amountDue - record.amountPaid;
  return remaining > 0
    ? `Amount is more than the remaining ${formatMoney(remaining)}.`
    : "This fee is already fully paid.";
}

export async function recordPayment(_prevState, formData) {
  await requireAdmin();
  const parsed = paymentSchema.safeParse(
    formValues(formData, ["student", "target", "month", "amount", "paidOn", "note"]),
  );
  if (!parsed.success) return { error: firstError(parsed) };
  const data = parsed.data;
  const payment = { amount: data.amount, paidOn: parseISODate(data.paidOn), note: data.note };

  await connectDB();
  let error;

  if (data.target === "monthly") {
    const match = /^(\d{4})-(\d{2})$/.exec(data.month);
    const year = match ? Number(match[1]) : NaN;
    const month = match ? Number(match[2]) : NaN;
    if (!match || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return { error: "Choose a valid month." };
    }

    const student = await Student.findById(data.student)
      .select("admissionDate monthlyFee")
      .lean();
    if (!student) return { error: "Student not found." };
    const admitted = new Date(student.admissionDate);
    if (monthIndex(year, month) < monthIndex(admitted.getUTCFullYear(), admitted.getUTCMonth() + 1)) {
      return { error: "That month is before the student's admission." };
    }

    const filter = { student: data.student, type: "monthly", year, month };
    try {
      await FeeRecord.updateOne(
        filter,
        { $setOnInsert: { amountDue: student.monthlyFee, amountPaid: 0, payments: [] } },
        { upsert: true },
      );
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }
    error = await pushPayment(filter, payment);
  } else {
    const recordId = data.target.slice("record:".length);
    error = await pushPayment(
      { _id: recordId, student: data.student, type: { $in: ["admission", "other"] } },
      payment,
    );
  }

  if (error) return { error };
  refresh();
  return { ok: true, message: `Payment of ${formatMoney(data.amount)} recorded.` };
}

export async function addOtherFee(_prevState, formData) {
  await requireAdmin();
  const parsed = otherFeeSchema.safeParse(
    formValues(formData, ["student", "description", "amountDue", "paidNow", "paidOn"]),
  );
  if (!parsed.success) return { error: firstError(parsed) };
  const data = parsed.data;

  await connectDB();
  if (!(await Student.exists({ _id: data.student }))) return { error: "Student not found." };

  await FeeRecord.create({
    student: data.student,
    type: "other",
    description: data.description,
    amountDue: data.amountDue,
    amountPaid: data.paidNow,
    payments:
      data.paidNow > 0 ? [{ amount: data.paidNow, paidOn: parseISODate(data.paidOn), note: "" }] : [],
  });

  refresh();
  return { ok: true, message: `${data.description} added.` };
}

export async function deletePayment(formData) {
  await requireAdmin();
  const recordId = String(formData.get("recordId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!isValidObjectId(recordId) || !isValidObjectId(paymentId)) return;

  await connectDB();
  const record = await FeeRecord.findOne(
    { _id: recordId, "payments._id": paymentId },
    { amountPaid: 1, "payments.$": 1 },
  ).lean();
  const paid = record?.payments?.[0]?.amount;
  if (paid === undefined) return;

  const nextPaid = Math.max((record.amountPaid || 0) - paid, 0);
  await FeeRecord.updateOne(
    { _id: recordId, "payments._id": paymentId },
    {
      $pull: { payments: { _id: paymentId } },
      $set: { amountPaid: nextPaid },
    },
  );
  refresh();
}

export async function deleteOtherFee(formData) {
  await requireAdmin();
  const recordId = String(formData.get("recordId") ?? "");
  if (!isValidObjectId(recordId)) return;

  await connectDB();
  await FeeRecord.deleteOne({ _id: recordId, type: "other", amountPaid: 0 });
  refresh();
}
