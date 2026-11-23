import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { isValidObjectId } from "mongoose";
import { connectDB } from "./db";
import { getToday } from "./dates";
import { formatMoney, monthLabel } from "./format";
import { billedRange, monthIndex, monthKey, monthStatus, groupRecords, summarizeStudent } from "./ledger";
import { Student } from "./models/Student";
import { FeeRecord } from "./models/FeeRecord";
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

function buildStatementFrom(student, records, today, nowIdx) {
  const groups = groupRecords(records);
  const group = groups.get(student.id) ?? { admission: [], other: [], monthly: new Map() };
  const summary = summarizeStudent(student, group, nowIdx);

  const { first, last } = billedRange(student, nowIdx);
  const rows = [];
  for (let idx = first; idx <= last; idx++) {
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    const record = group.monthly.get(monthKey(year, month));
    const status = monthStatus(student, record, year, month, nowIdx);
    if (status.state === "na") continue;
    const paidOn = lastPaidOn(record);
    rows.push({
      year,
      month,
      label: monthLabel(year, month),
      due: status.due,
      paid: status.paid,
      dues: Math.max(status.due - status.paid, 0),
      state: status.state,
      paidDate: paidOn ? shortDate(paidOn) : "—",
    });
  }

  return {
    student,
    today,
    summary,
    rows,
    amountPayable: summary.totalPending,
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
  const records = await FeeRecord.find({ student: studentId }).lean();
  return buildStatementFrom(student, records, today, nowIdx);
}

/** Current student + all siblings sharing the same CNIC (sorted by name). */
export async function getSiblingFeeStatementData(studentId) {
  if (!isValidObjectId(studentId)) return null;
  await connectDB();
  const raw = await Student.findById(studentId).lean();
  if (!raw) return null;

  const cnic = (raw.cnic || "").trim();
  if (!cnic) {
    const today = getToday();
    const nowIdx = monthIndex(today.year, today.month);
    const student = toStudent(raw);
    const records = await FeeRecord.find({ student: studentId }).lean();
    return [buildStatementFrom(student, records, today, nowIdx)];
  }

  const family = await Student.find({ cnic }).sort({ name: 1, studentId: 1 }).lean();
  const ids = family.map((s) => s._id);
  const allRecords = await FeeRecord.find({ student: { $in: ids } }).lean();
  const byStudent = new Map();
  for (const r of allRecords) {
    const id = String(r.student);
    if (!byStudent.has(id)) byStudent.set(id, []);
    byStudent.get(id).push(r);
  }

  const today = getToday();
  const nowIdx = monthIndex(today.year, today.month);
  return family.map((doc) => {
    const student = toStudent(doc);
    return buildStatementFrom(student, byStudent.get(student.id) ?? [], today, nowIdx);
  });
}

/** Draw one compact challan inside a vertical band of the page. */
async function drawChallanCopy(pdf, page, fonts, data, { top, bottom, left, width, copyLabel }) {
  const { muted, line, ink } = PDF_COLORS;
  const rowH = 13;
  const metaH = 14;

  let y = await drawSchoolHeader(pdf, page, fonts, {
    top,
    left,
    width,
    logoSize: 28,
  });

  if (copyLabel) {
    drawText(page, fonts, copyLabel, left, y, 7, { bold: true, color: muted });
    y -= 10;
  }

  // One line: ID · Class · Issue date · Name S/D/O Father
  const issue = shortDate(`${data.today.iso}T00:00:00.000Z`);
  const nameLine = `${data.student.name} S/D/O ${data.student.fatherName}`;
  drawBoxedRow(page, left, y, width, metaH);
  drawText(
    page,
    fonts,
    `ID ${data.student.studentId}   Class ${data.student.className}   ${issue}   ${nameLine}`,
    left + 3,
    y - 10,
    7,
    { bold: true },
  );
  y -= metaH + 4;

  const cols = [
    { label: "MONTH", x: left, w: width * 0.28 },
    { label: "TOTAL", x: left + width * 0.28, w: width * 0.18 },
    { label: "PAID", x: left + width * 0.46, w: width * 0.18 },
    { label: "DUES", x: left + width * 0.64, w: width * 0.18 },
    { label: "PAID DATE", x: left + width * 0.82, w: width * 0.18 },
  ];

  function drawTableHeader() {
    drawBoxedRow(page, left, y, width, rowH);
    for (const col of cols) {
      drawText(page, fonts, col.label, col.x + 2, y - 9, 6.5, { bold: true });
    }
    y -= rowH;
  }

  drawTableHeader();

  const minY = bottom + 52;
  const visibleRows = [];
  for (const row of data.rows) {
    if (y - rowH < minY + rowH * 2) break;
    visibleRows.push(row);
  }
  const hidden = data.rows.length - visibleRows.length;

  if (visibleRows.length === 0) {
    drawBoxedRow(page, left, y, width, rowH);
    drawText(page, fonts, "No monthly fees yet.", left + 3, y - 9, 7, { color: muted });
    y -= rowH;
  } else {
    for (const row of visibleRows) {
      drawBoxedRow(page, left, y, width, rowH);
      drawText(page, fonts, row.label, cols[0].x + 2, y - 9, 7);
      drawText(page, fonts, formatMoney(row.due), cols[1].x + 2, y - 9, 7);
      drawText(page, fonts, formatMoney(row.paid), cols[2].x + 2, y - 9, 7);
      drawText(page, fonts, formatMoney(row.dues), cols[3].x + 2, y - 9, 7, {
        bold: row.dues > 0,
      });
      drawText(page, fonts, row.paidDate, cols[4].x + 2, y - 9, 7);
      y -= rowH;
    }
  }

  if (hidden > 0) {
    drawText(page, fonts, `+ ${hidden} earlier month(s) on record`, left + 2, y - 2, 6, {
      color: muted,
    });
    y -= 10;
  }

  y -= 4;
  page.drawRectangle({
    x: left,
    y: y - 16,
    width,
    height: 16,
    borderColor: ink,
    borderWidth: 1,
  });
  drawText(page, fonts, "AMOUNT PAYABLE", left + 4, y - 11, 7, { bold: true });
  drawRightText(page, fonts, formatMoney(data.amountPayable), left + width - 4, y - 11, 8, {
    bold: true,
  });
  y -= 24;

  drawText(
    page,
    fonts,
    `Online: ${SCHOOL.bank.name} · ${SCHOOL.bank.title} · ${SCHOOL.bank.account}`,
    left,
    y,
    6.5,
    { color: muted },
  );
  y -= 14;

  page.drawLine({
    start: { x: left + width - 110, y },
    end: { x: left + width, y },
    thickness: 0.5,
    color: line,
  });
  drawText(page, fonts, "Authorized signature", left + width - 100, y - 9, 6, { color: muted });
}

function drawCutLine(page, fonts, { margin, width, mid }) {
  const { line, muted } = PDF_COLORS;
  page.drawLine({
    start: { x: margin, y: mid },
    end: { x: width - margin, y: mid },
    thickness: 0.6,
    color: line,
    dashArray: [3, 3],
  });
  drawText(page, fonts, "- cut here -", width / 2 - 22, mid + 2, 6, { color: muted });
}

/** One student: student copy + office copy on a single A4. */
export async function buildFeeStatementPdf(data) {
  const pdf = await PDFDocument.create();
  const fonts = {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    fontBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const { width, height, margin } = PDF_PAGE;
  const contentWidth = width - margin * 2;
  const mid = height / 2;
  const page = pdf.addPage([width, height]);

  await drawChallanCopy(pdf, page, fonts, data, {
    top: height - margin,
    bottom: mid + 6,
    left: margin,
    width: contentWidth,
    copyLabel: "Student copy",
  });
  drawCutLine(page, fonts, { margin, width, mid });
  await drawChallanCopy(pdf, page, fonts, data, {
    top: mid - 8,
    bottom: margin,
    left: margin,
    width: contentWidth,
    copyLabel: "Office copy",
  });

  return pdf.save();
}

/**
 * All siblings (same CNIC): packs two student challans per A4 page.
 * Family of 1 falls back to the normal student+office layout.
 */
export async function buildSiblingFeeStatementPdf(statements) {
  if (!statements?.length) {
    throw new Error("No students to print.");
  }
  if (statements.length === 1) {
    return buildFeeStatementPdf(statements[0]);
  }

  const pdf = await PDFDocument.create();
  const fonts = {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    fontBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const { width, height, margin } = PDF_PAGE;
  const contentWidth = width - margin * 2;
  const mid = height / 2;

  for (let i = 0; i < statements.length; i += 2) {
    const page = pdf.addPage([width, height]);
    const top = statements[i];
    const bottom = statements[i + 1];

    await drawChallanCopy(pdf, page, fonts, top, {
      top: height - margin,
      bottom: mid + 6,
      left: margin,
      width: contentWidth,
      copyLabel: `Student copy · ${top.student.name}`,
    });
    drawCutLine(page, fonts, { margin, width, mid });

    if (bottom) {
      await drawChallanCopy(pdf, page, fonts, bottom, {
        top: mid - 8,
        bottom: margin,
        left: margin,
        width: contentWidth,
        copyLabel: `Student copy · ${bottom.student.name}`,
      });
    }
  }

  return pdf.save();
}
