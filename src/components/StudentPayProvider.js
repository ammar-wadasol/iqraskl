"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Plus, Users, Wallet } from "lucide-react";
import Modal from "./Modal";
import { MonthCell } from "./MonthCell";
import OtherFeeForm from "./OtherFeeForm";
import PaymentForm from "./PaymentForm";
import StudentForm from "./StudentForm";

const StudentPayContext = createContext(null);

function useStudentPay() {
  const ctx = useContext(StudentPayContext);
  if (!ctx) throw new Error("useStudentPay must be used within StudentPayProvider");
  return ctx;
}

export default function StudentPayProvider({
  student,
  charges,
  today,
  year,
  payMonth,
  currentMonth,
  siblingCount = 0,
  children,
}) {
  const router = useRouter();
  const [modal, setModal] = useState(payMonth ? "payment" : null);
  const [month, setMonth] = useState(payMonth ?? currentMonth);
  const [seenPayMonth, setSeenPayMonth] = useState(payMonth);

  if (payMonth !== seenPayMonth) {
    setSeenPayMonth(payMonth);
    if (payMonth) {
      setMonth(payMonth);
      setModal("payment");
    }
  }

  function close() {
    setModal(null);
    if (payMonth) {
      const query = year === today.year ? "" : `?year=${year}`;
      router.replace(`/students/${student.id}${query}`, { scroll: false });
    }
  }

  const openPayMonth = useCallback((ym) => {
    setMonth(ym);
    setModal("payment");
  }, []);

  const value = {
    student,
    siblingCount,
    currentMonth,
    openPayMonth,
    openOther: () => setModal("other"),
    openEdit: () => setModal("edit"),
  };

  return (
    <StudentPayContext.Provider value={value}>
      {children}

      <Modal open={modal === "payment"} onClose={close} title={`Record payment · ${student.name}`}>
        <PaymentForm
          key={month}
          studentId={student.id}
          today={today.iso}
          defaultMonth={month}
          charges={charges}
          monthlyFee={student.monthlyFee}
          onSuccess={close}
          onCancel={close}
        />
      </Modal>

      <Modal open={modal === "other"} onClose={close} title={`Add other fee · ${student.name}`}>
        <OtherFeeForm studentId={student.id} today={today.iso} onSuccess={close} onCancel={close} />
      </Modal>

      <Modal open={modal === "edit"} onClose={close} title="Edit student details" size="lg">
        <StudentForm student={student} today={today.iso} onSuccess={close} onCancel={close} />
      </Modal>
    </StudentPayContext.Provider>
  );
}

export function StudentActionBar() {
  const { student, siblingCount, currentMonth, openPayMonth, openOther, openEdit } = useStudentPay();

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => openPayMonth(currentMonth)} className="btn btn-primary">
        <Wallet className="size-4" aria-hidden="true" />
        Record payment
      </button>
      <button type="button" onClick={openOther} className="btn">
        <Plus className="size-4" aria-hidden="true" />
        Add other fee
      </button>
      <a
        href={`/students/${student.id}/fees/pdf`}
        className="btn"
        aria-label="Download fee challan PDF"
        title="Download fee challan"
      >
        <Download className="size-4" aria-hidden="true" />
        Fee challan
      </a>
      {siblingCount > 0 && student.cnic && (
        <a
          href={`/students/${student.id}/fees/siblings/pdf`}
          className="btn"
          aria-label="Download fee challans for all siblings"
          title="Print challans for this student and all siblings (same CNIC)"
        >
          <Users className="size-4" aria-hidden="true" />
          Print siblings
        </a>
      )}
      <button
        type="button"
        onClick={openEdit}
        className="btn"
        aria-label="Edit details"
        title="Edit details"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Opens the payment modal for this month without navigating. */
export function StudentMonthPayCell({ year, month, status, title }) {
  const { openPayMonth } = useStudentPay();
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <MonthCell
      status={status}
      title={title}
      onClick={status.state === "na" ? undefined : () => openPayMonth(ym)}
    />
  );
}
