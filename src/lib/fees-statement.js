import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { isValidObjectId } from "mongoose";
import { connectDB } from "./db";
import { getToday } from "./dates";
import { formatMoney, monthLabel } from "./format";
import { billedRange, monthIndex, monthKey, monthStatus, groupRecords, summarizeStudent } from "./ledger";
import { Student } from "./models/Student";
import { FeeRecord } from "./models/FeeRecord";
import { Product } from "./models/Product";
import { ProductSale } from "./models/ProductSale";
import { SCHOOL } from "./school";
import {
  PDF_PAGE,
  PDF_COLORS,
  drawSchoolHeader,
  drawText,
  drawRightText,
  drawBoxedRow,
} from "./pdf-brand";

function lastPaidOn(record) {
  if (!record?.payments?.length) return null;
  let latest = null;
  for (const p of record.payments) {
    if (!p.paidOn) continue;
    const d = new Date(p.paidOn);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

function shortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function toStudent(raw) {
  return {
    id: String(raw._id),
    studentId: raw.studentId,
    name: raw.name,
    fatherName: raw.fatherName,
    cnic: raw.cnic || "",
    className: raw.className,
    phone: raw.phone || "",
    admissionDate: raw.admissionDate,
    monthlyFee: raw.monthlyFee,
    status: raw.status,
    leftDate: raw.leftDate || null,
  };
}

function pushChargeRow(rows, { label, record, due, paid, paidDate }) {
  const fromRecord = lastPaidOn(record);
  rows.push({
    label,
    due,
    paid,
    dues: Math.max(due - paid, 0),
    paidDate: paidDate ?? (fromRecord ? shortDate(fromRecord) : "—"),
  });
}

function saleRemaining(sale) {
  return Math.max(sale.totalAmount - sale.amountPaid - (sale.discount || 0), 0);
}

/** Open product sales keyed by student id, with product names resolved. */
async function loadOpenProductRowsByStudent(studentIds) {
  const byStudent = new Map();
  if (!studentIds.length) return byStudent;

  const sales = await ProductSale.find({ student: { $in: studentIds } }).lean();
  if (!sales.length) return byStudent;

  const productIds = [...new Set(sales.map((s) => String(s.product)))];
  const products = await Product.find({ _id: { $in: productIds } }).select("name").lean();
  const nameById = new Map(products.map((p) => [String(p._id), p.name]));

  for (const sale of sales) {
    const rem = saleRemaining(sale);
    if (rem <= 0) continue;
    const id = String(sale.student);
    if (!byStudent.has(id)) byStudent.set(id, []);
    const due = Math.max(sale.totalAmount - (sale.discount || 0), 0);
    byStudent.get(id).push({
      label: nameById.get(String(sale.product)) || "Product",
      due,
      paid: sale.amountPaid,
      dues: rem,
      paidDate: shortDate(sale.soldOn),
    });
  }
  return byStudent;
}

function buildStatementFrom(student, records, today, nowIdx, productRows = []) {
  const groups = groupRecords(records);
  const group = groups.get(student.id) ?? { admission: [], other: [], monthly: new Map() };
  const summary = summarizeStudent(student, group, nowIdx);

  const rows = [];

  // Admission + other charges first so outstanding dues always appear in the table.
  for (const record of group.admission) {
    pushChargeRow(rows, {
      label: record.description?.trim() || "Admission fee",
      record,
      due: record.amountDue,
      paid: record.amountPaid,
    });
  }
  for (const record of group.other) {
    pushChargeRow(rows, {
      label: record.description?.trim() || "Other fee",
      record,
      due: record.amountDue,
      paid: record.amountPaid,
    });
  }
  for (const row of productRows) {
    rows.push(row);
  }

  // Include through next month so challans can collect the upcoming fee.
  const { first, last } = billedRange(student, nowIdx);
  const nextIdx = nowIdx + 1;
  const endIdx = Math.max(last, nextIdx);
  for (let idx = first; idx <= endIdx; idx++) {
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    const record = group.monthly.get(monthKey(year, month));
    const status = monthStatus(student, record, year, month, nowIdx);
    if (status.state === "na") continue;
    pushChargeRow(rows, {
      label: monthLabel(year, month),
      record,
      due: status.due,
      paid: status.paid,
    });
  }

  // Challan only lists amounts still owed (skip cleared 0-dues lines).
  const openRows = rows.filter((r) => r.dues > 0);
  const amountPayable = openRows.reduce((acc, r) => acc + r.dues, 0);

  return {
    student,
    today,
    summary,
    rows: openRows,
    amountPayable,
  };
}

export async function getFeeStatementData(studentId) {
  if (!isValidObjectId(studentId)) return null;
  await connectDB();
  const raw = await Student.findById(studentId).lean();
  if (!raw) return null;

  const today = getToday();
  const nowIdx = monthIndex(today.year, today.month);
  const student = toStudent(raw);
  const [records, productByStudent] = await Promise.all([
    FeeRecord.find({ student: studentId }).lean(),
    loadOpenProductRowsByStudent([studentId]),
  ]);
  return buildStatementFrom(
    student,
    records,
    today,
    nowIdx,
    productByStudent.get(student.id) ?? [],
  );
}

/** Current student + all siblings sharing the same CNIC (sorted by name). */
export async function getSiblingFeeStatementData(studentId) {
  if (!isValidObjectId(studentId)) return null;
  await connectDB();
  const raw = await Student.findById(studentId).lean();
  if (!raw) return null;

  const cnic = (raw.cnic || "").trim();
  const today = getToday();
  const nowIdx = monthIndex(today.year, today.month);

  if (!cnic) {
    const student = toStudent(raw);
    const [records, productByStudent] = await Promise.all([
      FeeRecord.find({ student: studentId }).lean(),
      loadOpenProductRowsByStudent([studentId]),
    ]);
    return [
      buildStatementFrom(
        student,
        records,
        today,
        nowIdx,
        productByStudent.get(student.id) ?? [],
      ),
    ];
  }

  const family = await Student.find({ cnic })
    .collation({ locale: "en", numericOrdering: true })
    .sort({ studentId: 1 })
    .lean();
  const ids = family.map((s) => s._id);
  const [allRecords, productByStudent] = await Promise.all([
    FeeRecord.find({ student: { $in: ids } }).lean(),
    loadOpenProductRowsByStudent(ids),
  ]);
  const byStudent = new Map();
  for (const r of allRecords) {
    const id = String(r.student);
    if (!byStudent.has(id)) byStudent.set(id, []);
    byStudent.get(id).push(r);
  }

  return family.map((doc) => {
    const student = toStudent(doc);
    return buildStatementFrom(
      student,
      byStudent.get(student.id) ?? [],
      today,
      nowIdx,
      productByStudent.get(student.id) ?? [],
    );
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function batchStudentQuery(filters) {
  const query = {};
  if (filters.status && filters.status !== "all") query.status = filters.status;
  if (filters.className) query.className = filters.className;
  for (const field of ["name", "studentId", "fatherName"]) {
    if (filters[field]) {
      query[field] = { $regex: escapeRegex(filters[field]), $options: "i" };
    }
  }
  return query;
}

/**
 * Bulk challans for the fees calendar filters (class / status / search).
 * One challan per student, packed 4-up by the PDF builder.
 */
export async function getBatchFeeStatementData(filters) {
  await connectDB();
  const docs = await Student.find(batchStudentQuery(filters))
    .collation({ locale: "en", numericOrdering: true })
    .sort({ studentId: 1 })
    .lean();
  if (!docs.length) return [];

  const students = docs.map(toStudent);
  const ids = students.map((s) => s.id);
  const today = getToday();
  const nowIdx = monthIndex(today.year, today.month);
  const [allRecords, productByStudent] = await Promise.all([
    FeeRecord.find({ student: { $in: ids } }).lean(),
    loadOpenProductRowsByStudent(ids),
  ]);
  const byStudent = new Map();
  for (const r of allRecords) {
    const id = String(r.student);
    if (!byStudent.has(id)) byStudent.set(id, []);
    byStudent.get(id).push(r);
  }

  return students.map((student) =>
    buildStatementFrom(
      student,
      byStudent.get(student.id) ?? [],
      today,
      nowIdx,
      productByStudent.get(student.id) ?? [],
    ),
  );
}

/** Prefer unpaid rows, then keep original order for the rest. */
function pickVisibleRows(rows, maxRows) {
  if (rows.length <= maxRows) return { visible: rows, hidden: 0 };
  const unpaid = rows.filter((r) => r.dues > 0);
  const paid = rows.filter((r) => r.dues <= 0);
  const visible = [];
  for (const row of unpaid) {
    if (visible.length >= maxRows) break;
    visible.push(row);
  }
  for (const row of paid) {
    if (visible.length >= maxRows) break;
    visible.push(row);
  }
  return { visible, hidden: rows.length - visible.length };
}

/** Draw one compact challan inside an eighth-page cell. */
async function drawChallanCopy(pdf, page, fonts, data, { top, bottom, left, width, copyLabel }) {
  const { muted, line, ink } = PDF_COLORS;
  const rowH = 12;
  const metaH = 12;
  const pad = 3;
  const bodySize = 8;
  const headSize = 7;

  let y = await drawSchoolHeader(pdf, page, fonts, {
    top,
    left,
    width,
    logoSize: 26,
    titleSize: 8.5,
    metaSize: 6.5,
    topPad: 4,
  });

  if (copyLabel) {
    drawText(page, fonts, copyLabel, left, y, 7.5, { bold: true, color: muted });
    y -= 10;
  }

  const issue = shortDate(`${data.today.iso}T00:00:00.000Z`);
  drawBoxedRow(page, left, y, width, metaH * 2 + 2);
  drawText(page, fonts, `ID ${data.student.studentId}  ${data.student.className}`, left + pad, y - 9, bodySize, {
    bold: true,
  });
  drawText(page, fonts, issue, left + width - 44, y - 9, 7, { color: muted });
  drawText(
    page,
    fonts,
    `${data.student.name} S/D/O ${data.student.fatherName}`,
    left + pad,
    y - 21,
    bodySize,
    { bold: true },
  );
  y -= metaH * 2 + 5;

  // Tight column pack — money cols right-aligned to remove the middle gap.
  const cols = [
    { label: "PARTICULAR", x: left, w: width * 0.28, align: "left" },
    { label: "TOTAL", x: left + width * 0.28, w: width * 0.18, align: "right" },
    { label: "PAID", x: left + width * 0.46, w: width * 0.16, align: "right" },
    { label: "DUES", x: left + width * 0.62, w: width * 0.18, align: "right" },
    { label: "DATE", x: left + width * 0.80, w: width * 0.20, align: "right" },
  ];

  function cellText(value, col, baseline, size, opts = {}) {
    if (col.align === "right") {
      drawRightText(page, fonts, value, col.x + col.w - 2, baseline, size, opts);
    } else {
      drawText(page, fonts, value, col.x + 2, baseline, size, opts);
    }
  }

  drawBoxedRow(page, left, y, width, rowH, { fill: true });
  for (const col of cols) {
    cellText(col.label, col, y - 9, headSize, { bold: true });
  }
  y -= rowH;

  const footerReserve = 46;
  const maxRows = Math.max(1, Math.floor((y - (bottom + footerReserve)) / rowH));
  const { visible, hidden } = pickVisibleRows(data.rows, maxRows);

  if (visible.length === 0) {
    drawBoxedRow(page, left, y, width, rowH);
    drawText(page, fonts, "No fees yet.", left + pad, y - 9, bodySize, { color: muted });
    y -= rowH;
  } else {
    for (const row of visible) {
      const dateStr = !row.paidDate || row.paidDate === "—" ? issue : row.paidDate;
      drawBoxedRow(page, left, y, width, rowH);
      const label =
        row.label.length > 12 ? `${row.label.slice(0, 10)}…` : row.label;
      cellText(label, cols[0], y - 9, bodySize);
      cellText(formatMoney(row.due), cols[1], y - 9, bodySize);
      cellText(formatMoney(row.paid), cols[2], y - 9, bodySize);
      cellText(formatMoney(row.dues), cols[3], y - 9, bodySize, { bold: row.dues > 0 });
      cellText(dateStr, cols[4], y - 9, bodySize);
      y -= rowH;
    }
  }

  if (hidden > 0) {
    drawText(page, fonts, `+ ${hidden} more`, left + 2, y - 1, 6.5, { color: muted });
    y -= 8;
  }

  y -= 3;
  page.drawRectangle({
    x: left,
    y: y - 14,
    width,
    height: 14,
    borderColor: ink,
    borderWidth: 0.8,
  });
  drawText(page, fonts, "AMOUNT PAYABLE", left + 3, y - 10, 7.5, { bold: true });
  drawRightText(page, fonts, formatMoney(data.amountPayable), left + width - 3, y - 10, 8.5, {
    bold: true,
  });
  y -= 20;

  // Extra top padding before online payment line.
  y -= 4;
  drawText(
    page,
    fonts,
    `Online: ${SCHOOL.bank.name} · ${SCHOOL.bank.account}`,
    left,
    y,
    7,
    { color: muted },
  );
  y -= 11;

  page.drawLine({
    start: { x: left + width - 78, y },
    end: { x: left + width, y },
    thickness: 0.5,
    color: line,
  });
  drawText(page, fonts, "Cashier's signature", left + width - 76, y - 8, 6.5, { color: muted });
}

/** 2×4 grid: student copy with office copy directly underneath (8 per A4). */
function eightSlots({ width, height, margin, gap }) {
  const cols = 2;
  const rows = 4;
  const cellW = (width - margin * 2 - gap) / cols;
  const cellH = (height - margin * 2 - gap * (rows - 1)) / rows;
  const slots = [];
  for (let r = 0; r < rows; r++) {
    const top = height - margin - r * (cellH + gap);
    const bottom = top - cellH;
    for (let c = 0; c < cols; c++) {
      slots.push({
        left: margin + c * (cellW + gap),
        top,
        bottom,
        width: cellW,
      });
    }
  }
  return slots;
}

function drawEightGuides(page, { width, height, margin, gap }) {
  const { line } = PDF_COLORS;
  const slots = eightSlots({ width, height, margin, gap });
  const midX = width / 2;
  page.drawLine({
    start: { x: midX, y: margin },
    end: { x: midX, y: height - margin },
    thickness: 0.5,
    color: line,
    dashArray: [2, 2],
  });
  const rowBottoms = [slots[1].bottom, slots[3].bottom, slots[5].bottom];
  for (const y of rowBottoms) {
    const cutY = y - gap / 2;
    page.drawLine({
      start: { x: margin, y: cutY },
      end: { x: width - margin, y: cutY },
      thickness: 0.5,
      color: line,
      dashArray: [2, 2],
    });
  }
}

/**
 * Pack up to 4 students per page as 8 challans:
 * Student A | Student B
 * Office A  | Office B
 * Student C | Student D
 * Office C  | Office D
 */
async function fillEightPage(pdf, fonts, students) {
  const { width, height, margin } = PDF_PAGE;
  const gap = 6;
  const page = pdf.addPage([width, height]);
  const slots = eightSlots({ width, height, margin, gap });
  drawEightGuides(page, { width, height, margin, gap });

  const items = [];
  for (let pair = 0; pair < 2; pair++) {
    const left = students[pair * 2] || null;
    const right = students[pair * 2 + 1] || null;
    items.push(left ? { data: left, label: "Student copy" } : null);
    items.push(right ? { data: right, label: "Student copy" } : null);
    items.push(left ? { data: left, label: "Office copy" } : null);
    items.push(right ? { data: right, label: "Office copy" } : null);
  }

  for (let i = 0; i < 8; i++) {
    const item = items[i];
    if (!item) continue;
    await drawChallanCopy(pdf, page, fonts, item.data, {
      ...slots[i],
      copyLabel: item.label,
    });
  }
}

/** One student: student + office copies (office directly below). */
export async function buildFeeStatementPdf(data) {
  const pdf = await PDFDocument.create();
  const fonts = {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    fontBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  await fillEightPage(pdf, fonts, [data]);
  return pdf.save();
}

/**
 * Up to four students per A4: each with student copy and office copy below (8 slips).
 */
export async function buildBatchFeeStatementPdf(statements) {
  if (!statements?.length) {
    throw new Error("No students to print.");
  }

  const pdf = await PDFDocument.create();
  const fonts = {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    fontBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  for (let i = 0; i < statements.length; i += 4) {
    await fillEightPage(pdf, fonts, statements.slice(i, i + 4));
  }

  return pdf.save();
}

/** Sibling challans — same 8-up student/office layout. */
export async function buildSiblingFeeStatementPdf(statements) {
  if (!statements?.length) {
    throw new Error("No students to print.");
  }
  return buildBatchFeeStatementPdf(statements);
}
