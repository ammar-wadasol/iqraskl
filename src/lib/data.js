import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "./db";
import { getToday } from "./dates";
import { groupRecords, monthIndex, monthKey, monthStatus, summarizeStudent } from "./ledger";
import { Student } from "./models/Student";
import { FeeRecord } from "./models/FeeRecord";
import { ProductSale } from "./models/ProductSale";

export const PAGE_SIZE = 20;

const RECORD_TOTALS = "student type year month amountDue amountPaid";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

// Normalizes URL search params into filters shared by the list pages.
export function parseFilters(searchParams) {
  const page = Number.parseInt(searchParams.page, 10);
  const status = ["active", "left", "all"].includes(searchParams.status)
    ? searchParams.status
    : "active";
  return {
    name: text(searchParams.name),
    studentId: text(searchParams.studentId),
    fatherName: text(searchParams.fatherName),
    className: text(searchParams.className),
    status,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function buildStudentQuery(filters) {
  const query = {};
  if (filters.status !== "all") query.status = filters.status;
  if (filters.className) query.className = filters.className;
  for (const field of ["name", "studentId", "fatherName"]) {
    if (filters[field]) {
      query[field] = { $regex: escapeRegex(filters[field]), $options: "i" };
    }
  }
  return query;
}

function toPlainStudent(s) {
  return {
    id: String(s._id),
    studentId: s.studentId,
    name: s.name,
    fatherName: s.fatherName,
    cnic: s.cnic || "",
    className: s.className,
    phone: s.phone || "",
    admissionDate: s.admissionDate,
    monthlyFee: s.monthlyFee,
    status: s.status,
    leftDate: s.leftDate || null,
  };
}

async function findStudentsPage(filters) {
  await connectDB();
  const query = buildStudentQuery(filters);
  const total = await Student.countDocuments(query);
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const page = Math.min(filters.page, pageCount);
  const students = await Student.find(query)
    .sort({ name: 1, studentId: 1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();
  return { students: students.map(toPlainStudent), total, page, pageCount };
}

export async function listStudents(filters) {
  const { year, month } = getToday();
  const nowIdx = monthIndex(year, month);
  const result = await findStudentsPage(filters);

  const records = await FeeRecord.find({
    student: { $in: result.students.map((s) => s.id) },
  })
    .select(RECORD_TOTALS)
    .lean();
  const groups = groupRecords(records);

  return {
    ...result,
    students: result.students.map((s) => ({
      ...s,
      summary: summarizeStudent(s, groups.get(s.id), nowIdx),
    })),
  };
}

export function parseFeeFilters(searchParams) {
  const filters = parseFilters(searchParams);
  const unpaidMonth = Number.parseInt(searchParams.unpaidMonth, 10);
  return {
    ...filters,
    unpaidMonth:
      Number.isFinite(unpaidMonth) && unpaidMonth >= 1 && unpaidMonth <= 12
        ? unpaidMonth
        : null,
  };
}

export async function getFeeCalendar(filters, year) {
  await connectDB();
  const today = getToday();
  const nowIdx = monthIndex(today.year, today.month);
  const query = buildStudentQuery(filters);

  let students;
  let total;
  let page;
  let pageCount;

  if (filters.unpaidMonth) {
    // Need the full matching set first so pagination counts only unpaid students.
    const all = (await Student.find(query).sort({ name: 1, studentId: 1 }).lean()).map(
      toPlainStudent,
    );
    const monthRecords = await FeeRecord.find({
      student: { $in: all.map((s) => s.id) },
      type: "monthly",
      year,
      month: filters.unpaidMonth,
    })
      .select(RECORD_TOTALS)
      .lean();
    const monthGroups = groupRecords(monthRecords);
    const unpaid = all.filter((s) => {
      const record = monthGroups.get(s.id)?.monthly.get(monthKey(year, filters.unpaidMonth));
      const status = monthStatus(s, record, year, filters.unpaidMonth, nowIdx);
      return status.state === "unpaid" || status.state === "partial";
    });

    total = unpaid.length;
    pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
    page = Math.min(filters.page, pageCount);
    students = unpaid.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const result = await findStudentsPage(filters);
    students = result.students;
    total = result.total;
    page = result.page;
    pageCount = result.pageCount;
  }

  const records = await FeeRecord.find({
    student: { $in: students.map((s) => s.id) },
    type: "monthly",
    year,
  })
    .select(RECORD_TOTALS)
    .lean();
  const groups = groupRecords(records);

  return {
    total,
    page,
    pageCount,
    students: students.map((s) => {
      const monthly = groups.get(s.id)?.monthly ?? new Map();
      const months = Array.from({ length: 12 }, (_, i) =>
        monthStatus(s, monthly.get(monthKey(year, i + 1)), year, i + 1, nowIdx),
      );
      return {
        ...s,
        months,
        yearPaid: months.reduce((acc, m) => acc + m.paid, 0),
        yearPending: months.reduce(
          (acc, m) =>
            m.state === "unpaid" || m.state === "partial"
              ? acc + Math.max(m.due - m.paid, 0)
              : acc,
          0,
        ),
      };
    }),
  };
}

export async function getDashboardStats() {
  await connectDB();
  const today = getToday();
  const nowIdx = monthIndex(today.year, today.month);

  const [students, records] = await Promise.all([
    Student.find({})
      .select("studentId name fatherName className admissionDate monthlyFee status leftDate")
      .lean(),
    FeeRecord.find({}).select(RECORD_TOTALS).lean(),
  ]);
  const groups = groupRecords(records);

  const byType = {
    admission: { due: 0, paid: 0, pending: 0 },
    monthly: { due: 0, paid: 0, pending: 0 },
    other: { due: 0, paid: 0, pending: 0 },
    products: { due: 0, paid: 0, pending: 0 },
  };
  let activeCount = 0;
  let behindTwoOrMore = 0;
  const unpaidThisMonth = [];

  for (const raw of students) {
    const s = toPlainStudent(raw);
    const sum = summarizeStudent(s, groups.get(s.id), nowIdx);

    byType.admission.due += sum.admissionDue;
    byType.admission.paid += sum.admissionPaid;
    byType.admission.pending += sum.admissionPending;
    byType.other.due += sum.otherDue;
    byType.other.paid += sum.otherPaid;
    byType.other.pending += sum.otherPending;
    byType.monthly.paid += sum.monthlyPaid;
    byType.monthly.pending += sum.monthlyPending;

    if (s.status !== "active") continue;
    activeCount += 1;
    if (sum.monthsBehind >= 2) behindTwoOrMore += 1;
    if (sum.currentMonthState === "unpaid" || sum.currentMonthState === "partial") {
      unpaidThisMonth.push({ ...s, monthsBehind: sum.monthsBehind, pending: sum.monthlyPending });
    }
  }
  byType.monthly.due = byType.monthly.paid + byType.monthly.pending;

  const productTotals = await ProductSale.aggregate([
    {
      $group: {
        _id: null,
        due: { $sum: "$totalAmount" },
        paid: { $sum: "$amountPaid" },
        discount: { $sum: { $ifNull: ["$discount", 0] } },
      },
    },
  ]);
  if (productTotals[0]) {
    byType.products.due = productTotals[0].due;
    byType.products.paid = productTotals[0].paid;
    byType.products.pending = Math.max(
      productTotals[0].due - productTotals[0].paid - productTotals[0].discount,
      0,
    );
  }

  const yearRange = {
    start: new Date(Date.UTC(today.year, 0, 1)),
    end: new Date(Date.UTC(today.year + 1, 0, 1)),
  };
  const [feeCollections, productCollections] = await Promise.all([
    FeeRecord.aggregate([
      { $match: { "payments.paidOn": { $gte: yearRange.start, $lt: yearRange.end } } },
      { $unwind: "$payments" },
      { $match: { "payments.paidOn": { $gte: yearRange.start, $lt: yearRange.end } } },
      {
        $group: {
          _id: { $month: { date: "$payments.paidOn", timezone: "UTC" } },
          total: { $sum: "$payments.amount" },
        },
      },
    ]),
    ProductSale.aggregate([
      { $match: { soldOn: { $gte: yearRange.start, $lt: yearRange.end } } },
      {
        $group: {
          _id: { $month: { date: "$soldOn", timezone: "UTC" } },
          total: { $sum: "$amountPaid" },
        },
      },
    ]),
  ]);
  const collectedByMonth = Array.from({ length: 12 }, (_, i) => {
    const fee = feeCollections.find((c) => c._id === i + 1)?.total ?? 0;
    const product = productCollections.find((c) => c._id === i + 1)?.total ?? 0;
    return fee + product;
  });

  unpaidThisMonth.sort((a, b) => b.monthsBehind - a.monthsBehind || b.pending - a.pending);

  return {
    today,
    activeCount,
    totalCollected:
      byType.admission.paid + byType.monthly.paid + byType.other.paid + byType.products.paid,
    totalPending:
      byType.admission.pending +
      byType.monthly.pending +
      byType.other.pending +
      byType.products.pending,
    collectedThisMonth: collectedByMonth[today.month - 1],
    unpaidThisMonthCount: unpaidThisMonth.length,
    behindTwoOrMore,
    unpaidThisMonth: unpaidThisMonth.slice(0, 10),
    byType,
    collectedByMonth,
  };
}

export async function getStudentDetail(id) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const raw = await Student.findById(id).lean();
  if (!raw) return null;

  const today = getToday();
  const nowIdx = monthIndex(today.year, today.month);
  const student = toPlainStudent(raw);
  const records = await FeeRecord.find({ student: id }).lean();
  const groups = groupRecords(records);
  const group = groups.get(id);

  const charges = records
    .filter((r) => r.type !== "monthly")
    .sort((a, b) => (a.type === "admission" ? -1 : b.type === "admission" ? 1 : a.createdAt - b.createdAt))
    .map((r) => ({
      id: String(r._id),
      type: r.type,
      description: r.description,
      amountDue: r.amountDue,
      amountPaid: r.amountPaid,
      createdAt: r.createdAt,
    }));

  const payments = records
    .flatMap((r) =>
      r.payments.map((p) => ({
        id: String(p._id),
        recordId: String(r._id),
        type: r.type,
        description: r.description,
        year: r.year,
        month: r.month,
        amount: p.amount,
        paidOn: p.paidOn,
        note: p.note,
      })),
    )
    .sort((a, b) => b.paidOn - a.paidOn);

  const monthsFor = (year) => {
    const monthly = group?.monthly ?? new Map();
    return Array.from({ length: 12 }, (_, i) =>
      monthStatus(student, monthly.get(monthKey(year, i + 1)), year, i + 1, nowIdx),
    );
  };

  let siblings = [];
  if (student.cnic) {
    const siblingDocs = await Student.find({
      cnic: student.cnic,
      _id: { $ne: raw._id },
    })
      .sort({ name: 1, studentId: 1 })
      .lean();
    if (siblingDocs.length > 0) {
      const siblingIds = siblingDocs.map((s) => String(s._id));
      const siblingRecords = await FeeRecord.find({ student: { $in: siblingIds } })
        .select(RECORD_TOTALS)
        .lean();
      const siblingGroups = groupRecords(siblingRecords);
      siblings = siblingDocs.map((doc) => {
        const plain = toPlainStudent(doc);
        return {
          ...plain,
          summary: summarizeStudent(plain, siblingGroups.get(plain.id), nowIdx),
        };
      });
    }
  }

  return {
    today,
    student,
    summary: summarizeStudent(student, group, nowIdx),
    siblings,
    charges,
    payments,
    monthsFor,
  };
}

/** All students in a class (for printable class list). Status filter still applies. */
export async function listStudentsByClass(className, status = "active") {
  if (!className) return [];
  await connectDB();
  const query = { className };
  if (status !== "all") query.status = status;
  const students = await Student.find(query).sort({ name: 1, studentId: 1 }).lean();
  return students.map(toPlainStudent);
}
