import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { formatDate, formatMoney } from "./format";
import { getToday } from "./dates";
import { listStudentsByClass } from "./data";
import {
  PDF_PAGE,
  PDF_COLORS,
  drawSchoolHeader,
  drawText,
  drawBoxedRow,
} from "./pdf-brand";

export async function getClassListData(className, status = "active") {
  const students = await listStudentsByClass(className, status);
  return {
    className,
    status,
    today: getToday(),
    students,
  };
}

export async function buildClassListPdf(data) {
  const pdf = await PDFDocument.create();
  const fonts = {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    fontBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const { width, height, margin } = PDF_PAGE;
  const { muted, line } = PDF_COLORS;
  const contentWidth = width - margin * 2;

  let page = pdf.addPage([width, height]);
  let y = await drawSchoolHeader(pdf, page, fonts);

  const statusLabel =
    data.status === "all" ? "All students" : data.status === "left" ? "Left school" : "Active students";
  drawText(
    page,
    fonts,
    `Class ${data.className}  ·  ${statusLabel}  ·  ${data.students.length} student${data.students.length === 1 ? "" : "s"}  ·  ${formatDate(`${data.today.iso}T00:00:00.000Z`)}`,
    margin,
    y,
    8,
    { color: muted },
  );
  y -= 16;

  const cols = [
    { label: "#", x: margin + 4, key: "n" },
    { label: "Student ID", x: margin + 28, key: "id" },
    { label: "Name", x: margin + 105, key: "name" },
    { label: "Father name", x: margin + 250, key: "father" },
    { label: "Phone", x: margin + 380, key: "phone" },
    { label: "Fee", x: margin + 470, key: "fee" },
  ];

  async function newPage() {
    page = pdf.addPage([width, height]);
    y = await drawSchoolHeader(pdf, page, fonts);
    drawText(
      page,
      fonts,
      `Class ${data.className} (continued)`,
      margin,
      y,
      8,
      { color: muted },
    );
    y -= 16;
    drawColumnHeaders();
  }

  function drawColumnHeaders() {
    drawBoxedRow(page, margin, y + 10, contentWidth, 18);
    for (const col of cols) {
      drawText(page, fonts, col.label, col.x, y, 8, { bold: true });
    }
    y -= 16;
  }

  drawColumnHeaders();

  if (data.students.length === 0) {
    drawText(page, fonts, "No students in this class for the selected status.", margin, y, 10, {
      color: muted,
    });
  } else {
    for (let i = 0; i < data.students.length; i++) {
      if (y < margin + 24) await newPage();
      const s = data.students[i];
      drawText(page, fonts, String(i + 1), cols[0].x, y, 9);
      drawText(page, fonts, s.studentId, cols[1].x, y, 9);
      drawText(page, fonts, truncate(s.name, 24), cols[2].x, y, 9);
      drawText(page, fonts, truncate(s.fatherName, 22), cols[3].x, y, 9);
      drawText(page, fonts, s.phone || "—", cols[4].x, y, 9);
      drawText(page, fonts, formatMoney(s.monthlyFee), cols[5].x, y, 9);
      y -= 14;
      if (i < data.students.length - 1 && y > margin + 24) {
        page.drawLine({
          start: { x: margin, y: y + 8 },
          end: { x: width - margin, y: y + 8 },
          thickness: 0.3,
          color: line,
        });
      }
    }
  }

  return pdf.save();
}

function truncate(value, max) {
  const s = String(value ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
