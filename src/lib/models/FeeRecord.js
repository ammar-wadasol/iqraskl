import { Schema, model, models } from "mongoose";

export const FEE_TYPES = ["admission", "monthly", "other"];

const paymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paidOn: { type: Date, required: true },
    note: { type: String, trim: true, default: "" },
  },
  { _id: true },
);

// One record per charge. Payments against the charge are appended to
// `payments` and `amountPaid` is kept equal to their sum.
// Monthly records are created on first payment; until then a month's due
// is the student's current `monthlyFee`.
const feeRecordSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    type: { type: String, enum: FEE_TYPES, required: true },
    description: { type: String, trim: true, default: "" },
    year: { type: Number, min: 2000, max: 2100 },
    month: { type: Number, min: 1, max: 12 },
    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true },
);

feeRecordSchema.index({ student: 1, type: 1 });
feeRecordSchema.index(
  { student: 1, year: 1, month: 1 },
  { unique: true, partialFilterExpression: { type: "monthly" } },
);
feeRecordSchema.index(
  { student: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "admission" },
    name: "unique_admission_per_student",
  },
);
feeRecordSchema.index({ "payments.paidOn": 1 });

export const FeeRecord = models.FeeRecord || model("FeeRecord", feeRecordSchema);
