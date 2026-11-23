"use server";

import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { connectDB } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";
import { Student } from "@/lib/models/Student";
import { FeeRecord } from "@/lib/models/FeeRecord";
import { CLASS_OPTIONS } from "@/lib/classes";
import {
  amount,
  firstError,
  formValues,
  isoDate,
  pakistanCnic,
  pakistanPhone,
  requiredText,
} from "@/lib/validation";

const studentFields = {
  studentId: requiredText("Student ID", 40),
  name: requiredText("Name"),
  fatherName: requiredText("Father name"),
  cnic: pakistanCnic,
  className: z
    .string()
    .refine((value) => CLASS_OPTIONS.includes(value), { message: "Select a class." }),
  phone: pakistanPhone,
  admissionDate: isoDate,
  monthlyFee: amount,
};

const createSchema = z
  .object({
    ...studentFields,
    admissionFee: amount,
    admissionPaid: amount,
  })
  .refine((v) => v.admissionPaid <= v.admissionFee, {
    message: "Admission amount paid cannot exceed the admission fee.",
  });

const updateSchema = z
  .object({
    ...studentFields,
    id: z.string().refine(isValidObjectId, "Invalid student."),
    status: z.enum(["active", "left"]),
    leftDate: z.union([isoDate, z.literal("")]).optional().default(""),
  })
  .refine((v) => v.status === "active" || v.leftDate, {
    message: "Enter the date the student left.",
  });

function duplicateIdError(error) {
  return error?.code === 11000 ? { error: "A student with this Student ID already exists." } : null;
}

export async function createStudent(_prevState, formData) {
  await requireAdmin();
  const parsed = createSchema.safeParse(
    formValues(formData, [...Object.keys(studentFields), "admissionFee", "admissionPaid"]),
  );
  if (!parsed.success) return { error: firstError(parsed) };
  const data = parsed.data;

  await connectDB();
  const admissionDate = parseISODate(data.admissionDate);
  let student;
  try {
    student = await Student.create({
      studentId: data.studentId,
      name: data.name,
      fatherName: data.fatherName,
      cnic: data.cnic,
      className: data.className,
      phone: data.phone,
      admissionDate,
      monthlyFee: data.monthlyFee,
    });
  } catch (error) {
    const known = duplicateIdError(error);
    if (known) return known;
    throw error;
  }

  try {
    await FeeRecord.create({
      student: student._id,
      type: "admission",
      description: "Admission fee",
      amountDue: data.admissionFee,
      amountPaid: data.admissionPaid,
      payments:
        data.admissionPaid > 0
          ? [{ amount: data.admissionPaid, paidOn: admissionDate, note: "Paid at admission" }]
          : [],
    });
  } catch (error) {
    await Student.deleteOne({ _id: student._id });
    throw error;
  }

  redirect(`/students/${student._id}`);
}

export async function updateStudent(_prevState, formData) {
  await requireAdmin();
  const parsed = updateSchema.safeParse(
    formValues(formData, [...Object.keys(studentFields), "id", "status", "leftDate"]),
  );
  if (!parsed.success) return { error: firstError(parsed) };
  const data = parsed.data;

  await connectDB();
  try {
    const result = await Student.updateOne(
      { _id: data.id },
      {
        studentId: data.studentId,
        name: data.name,
        fatherName: data.fatherName,
        cnic: data.cnic,
        className: data.className,
        phone: data.phone,
        admissionDate: parseISODate(data.admissionDate),
        monthlyFee: data.monthlyFee,
        status: data.status,
        leftDate: data.status === "left" ? parseISODate(data.leftDate) : null,
      },
      { runValidators: true },
    );
    if (result.matchedCount === 0) return { error: "Student not found." };
  } catch (error) {
    const known = duplicateIdError(error);
    if (known) return known;
    throw error;
  }

  refresh();
  return { ok: true, message: "Student details saved." };
}
