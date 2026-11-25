"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import PaymentForm from "./PaymentForm";
import { MonthCell } from "./MonthCell";

// Month cell on the fees calendar: opens payment modal in place (no student-page navigation).
export default function FeesMonthPay({
  status,
  title,
  studentId,
  studentName,
  monthlyFee,
  payMonth,
  today,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (status.state === "na") {
    return <MonthCell status={status} title={title} compact />;
  }

  function close() {
    setOpen(false);
  }

  function onSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="block w-full cursor-pointer text-left"
        title={title}
        onClick={() => setOpen(true)}
      >
        <MonthCell status={status} title={title} compact />
      </button>
      <Modal open={open} onClose={close} title={`Record payment · ${studentName}`}>
        <PaymentForm
          studentId={studentId}
          today={today}
          defaultMonth={payMonth}
          charges={[]}
          monthlyFee={monthlyFee}
          onSuccess={onSuccess}
          onCancel={close}
        />
      </Modal>
    </>
  );
}
