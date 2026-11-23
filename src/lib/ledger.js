// Pure fee calculations shared by the dashboard, students list and calendar.

export function monthIndex(year, month) {
  return year * 12 + (month - 1);
}

function indexOfDate(date) {
  const d = new Date(date);
  return monthIndex(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function monthKey(year, month) {
  return `${year}-${month}`;
}

// First and last month index a student is billed for. `last` is capped at the
// current month, so future months never count as pending.
export function billedRange(student, nowIdx) {
  const first = indexOfDate(student.admissionDate);
  let last = nowIdx;
  if (student.status === "left" && student.leftDate) {
    last = Math.min(last, indexOfDate(student.leftDate));
  }
  return { first, last };
}

// State of a single month for a student:
// "na" (not enrolled), "upcoming", "unpaid", "partial" or "paid".
export function monthStatus(student, record, year, month, nowIdx) {
  const idx = monthIndex(year, month);
  const first = indexOfDate(student.admissionDate);
  const leftIdx =
    student.status === "left" && student.leftDate
      ? indexOfDate(student.leftDate)
      : Number.MAX_SAFE_INTEGER;

  const due = record ? record.amountDue : student.monthlyFee;
  const paid = record ? record.amountPaid : 0;

  if (!record && (idx < first || idx > leftIdx)) {
    return { state: "na", due: 0, paid: 0 };
  }
  if (paid >= due) return { state: "paid", due, paid };
  if (paid > 0) return { state: "partial", due, paid };
  if (idx > nowIdx) return { state: "upcoming", due, paid };
  return { state: "unpaid", due, paid };
}

// Groups lean fee records by student id.
export function groupRecords(records) {
  const byStudent = new Map();
  for (const r of records) {
    const id = String(r.student);
    if (!byStudent.has(id)) {
      byStudent.set(id, { admission: [], other: [], monthly: new Map() });
    }
    const group = byStudent.get(id);
    if (r.type === "monthly") group.monthly.set(monthKey(r.year, r.month), r);
    else group[r.type].push(r);
  }
  return byStudent;
}

const EMPTY_GROUP = { admission: [], other: [], monthly: new Map() };

// Totals for one student. `monthlyPending` covers billed months up to now.
export function summarizeStudent(student, group = EMPTY_GROUP, nowIdx) {
  const sum = (list, field) => list.reduce((acc, r) => acc + r[field], 0);

  const admissionDue = sum(group.admission, "amountDue");
  const admissionPaid = sum(group.admission, "amountPaid");
  const otherDue = sum(group.other, "amountDue");
  const otherPaid = sum(group.other, "amountPaid");

  let monthlyPaid = 0;
  for (const r of group.monthly.values()) monthlyPaid += r.amountPaid;

  let monthlyPending = 0;
  let monthsBehind = 0;
  const { first, last } = billedRange(student, nowIdx);
  for (let idx = first; idx <= last; idx++) {
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    const record = group.monthly.get(monthKey(year, month));
    const due = record ? record.amountDue : student.monthlyFee;
    const paid = record ? record.amountPaid : 0;
    const remaining = Math.max(due - paid, 0);
    monthlyPending += remaining;
    if (remaining > 0) monthsBehind += 1;
  }

  const current = monthStatus(
    student,
    group.monthly.get(monthKey(Math.floor(nowIdx / 12), (nowIdx % 12) + 1)),
    Math.floor(nowIdx / 12),
    (nowIdx % 12) + 1,
    nowIdx,
  );

  return {
    admissionDue,
    admissionPaid,
    admissionPending: Math.max(admissionDue - admissionPaid, 0),
    otherDue,
    otherPaid,
    otherPending: Math.max(otherDue - otherPaid, 0),
    monthlyPaid,
    monthlyPending,
    monthsBehind,
    currentMonthState: current.state,
    totalPaid: admissionPaid + otherPaid + monthlyPaid,
    totalPending:
      Math.max(admissionDue - admissionPaid, 0) +
      Math.max(otherDue - otherPaid, 0) +
      monthlyPending,
  };
}
