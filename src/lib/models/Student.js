import { Schema, model, models } from "mongoose";

export const STUDENT_STATUSES = ["active", "left"];

const studentSchema = new Schema(
  {
    studentId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    // Required on create/update via form validation; empty allowed for older records.
    cnic: { type: String, trim: true, default: "" },
    className: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    admissionDate: { type: Date, required: true },
    monthlyFee: { type: Number, required: true, min: 0 },
    status: { type: String, enum: STUDENT_STATUSES, default: "active" },
    leftDate: { type: Date, default: null },
  },
  { timestamps: true },
);

studentSchema.index({ name: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ cnic: 1 });
studentSchema.index({ className: 1, status: 1, name: 1 });

if (models.Student) {
  delete models.Student;
}

export const Student = model("Student", studentSchema);
