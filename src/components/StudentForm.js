"use client";

import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { createStudent, updateStudent } from "@/app/actions/students";
import { CLASS_OPTIONS } from "@/lib/classes";
import { toISODate } from "@/lib/format";
import { formatCnicInput, formatPhoneInput, PK_CNIC_HINT, PK_PHONE_HINT } from "@/lib/pakistan";
import { useFormAction } from "./useFormAction";

function Field({ label, name, children, hint, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={`sf-${name}`} className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Used for both adding a student (no `student`) and editing one (in a modal).
export default function StudentForm({ student, today, onSuccess, onCancel }) {
  const isEdit = Boolean(student);
  const { state, pending, formRef, onSubmit } = useFormAction(
    isEdit ? updateStudent : createStudent,
    { onSuccess },
  );
  const [status, setStatus] = useState(student?.status ?? "active");
  const [cnic, setCnic] = useState(student?.cnic ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "");
  const classOptions =
    student?.className && !CLASS_OPTIONS.includes(student.className)
      ? [student.className, ...CLASS_OPTIONS]
      : CLASS_OPTIONS;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={student.id} />}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isEdit ? "" : "lg:grid-cols-3"}`}>
        <Field label="Student ID" name="studentId">
          <input id="sf-studentId" name="studentId" required maxLength={40} defaultValue={student?.studentId} className="input" />
        </Field>
        <Field label="Student name" name="name">
          <input id="sf-name" name="name" required maxLength={100} defaultValue={student?.name} className="input" />
        </Field>
        <Field label="Father name" name="fatherName">
          <input id="sf-fatherName" name="fatherName" required maxLength={100} defaultValue={student?.fatherName} className="input" />
        </Field>
        <Field label="Father / guardian CNIC" name="cnic" hint={PK_CNIC_HINT}>
          <input
            id="sf-cnic"
            name="cnic"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="12345-1234567-1"
            pattern="\d{5}-\d{7}-\d"
            title={PK_CNIC_HINT}
            value={cnic}
            onChange={(e) => setCnic(formatCnicInput(e.target.value))}
            className="input font-mono"
          />
        </Field>
        <Field label="Class" name="className">
          <select id="sf-className" name="className" required defaultValue={student?.className ?? ""} className="input">
            <option value="" disabled>
              Select class
            </option>
            {classOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phone" name="phone" hint={PK_PHONE_HINT}>
          <input
            id="sf-phone"
            name="phone"
            type="tel"
            required
            inputMode="numeric"
            placeholder="03XXXXXXXXX"
            maxLength={11}
            pattern="03\d{9}"
            title={PK_PHONE_HINT}
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="input font-mono"
          />
        </Field>
        <Field label="Admission date" name="admissionDate">
          <input
            id="sf-admissionDate"
            name="admissionDate"
            type="date"
            required
            defaultValue={isEdit ? toISODate(student.admissionDate) : today}
            className="input"
          />
        </Field>
        <Field
          label="Monthly fee (Rs)"
          name="monthlyFee"
          hint={isEdit ? "Changes apply to months with no payment recorded yet." : undefined}
        >
          <input id="sf-monthlyFee" name="monthlyFee" type="number" min={0} step={1} required defaultValue={student?.monthlyFee} className="input" />
        </Field>

        {!isEdit && (
          <>
            <Field
              label="Admission fee (Rs)"
              name="admissionFee"
              hint="Total of admission, books, uniform and stationery."
            >
              <input id="sf-admissionFee" name="admissionFee" type="number" min={0} step={1} required defaultValue={0} className="input" />
            </Field>
            <Field label="Admission fee paid now (Rs)" name="admissionPaid">
              <input id="sf-admissionPaid" name="admissionPaid" type="number" min={0} step={1} required defaultValue={0} className="input" />
            </Field>
          </>
        )}

        {isEdit && (
          <>
            <Field label="Status" name="status">
              <select
                id="sf-status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input"
              >
                <option value="active">Active</option>
                <option value="left">Left school</option>
              </select>
            </Field>
            {status === "left" && (
              <Field label="Date left" name="leftDate" hint="No monthly fees are due after this month.">
                <input
                  id="sf-leftDate"
                  name="leftDate"
                  type="date"
                  required
                  defaultValue={toISODate(student.leftDate) || today}
                  className="input"
                />
              </Field>
            )}
          </>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn">Cancel</button>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {isEdit ? (
            <Save className="size-4" aria-hidden="true" />
          ) : (
            <UserPlus className="size-4" aria-hidden="true" />
          )}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add student"}
        </button>
      </div>
    </form>
  );
}
