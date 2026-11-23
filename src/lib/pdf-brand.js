import "server-only";
import fs from "fs";
import path from "path";
import { rgb } from "pdf-lib";
import { SCHOOL } from "./school";

const A4 = [595.28, 841.89];
const LOGO_PATH = path.join(process.cwd(), "public", "school-logo.png");

export const PDF_PAGE = { width: A4[0], height: A4[1], margin: 10 };

export const PDF_COLORS = {
  ink: rgb(0.08, 0.08, 0.08),
  muted: rgb(0.35, 0.35, 0.35),
  line: rgb(0.55, 0.55, 0.55),
  navy: rgb(0.05, 0.12, 0.35),
  fill: rgb(0.94, 0.95, 0.97),
};

let logoBytesCache = null;

export function loadSchoolLogoBytes() {
  if (!logoBytesCache) {
    logoBytesCache = fs.readFileSync(LOGO_PATH);
  }
  return logoBytesCache;
}

/**
 * Draws school letterhead inside a region.
 * `top` is the top Y of the region; returns Y just below the header rule.
 */
export async function drawSchoolHeader(
  pdf,
  page,
  fonts,
  {
    top = PDF_PAGE.height - PDF_PAGE.margin,
    left = PDF_PAGE.margin,
    width = PDF_PAGE.width - PDF_PAGE.margin * 2,
    logoSize = 36,
  } = {},
) {
  const { muted, line, ink } = PDF_COLORS;
  const { font, fontBold } = fonts;
  let y = top;

  const logoBytes = loadSchoolLogoBytes();
  const logo = await pdf.embedPng(logoBytes);
  page.drawImage(logo, {
    x: left,
    y: y - logoSize,
    width: logoSize,
    height: logoSize,
  });

  const textLeft = left + logoSize + 8;
  const textWidth = width - logoSize - 8;

  function centered(value, atY, size, bold = false, color = ink) {
    const f = bold ? fontBold : font;
    const w = f.widthOfTextAtSize(String(value), size);
    page.drawText(String(value), {
      x: textLeft + Math.max((textWidth - w) / 2, 0),
      y: atY,
      size,
      font: f,
      color,
    });
  }

  centered(SCHOOL.name, y - 12, 10, true, ink);
  centered(SCHOOL.address, y - 23, 7, false, muted);
  centered(`${SCHOOL.phone}  |  ${SCHOOL.email}`, y - 33, 7, false, muted);

  // Sit below both the logo and the contact line (baseline + a little gap).
  y = Math.min(y - logoSize, y - 33 - 8);
  page.drawLine({
    start: { x: left, y },
    end: { x: left + width, y },
    thickness: 0.8,
    color: line,
  });
  return y - 8;
}

export function drawText(page, fonts, value, x, y, size = 10, opts = {}) {
  const { bold = false, color = PDF_COLORS.ink } = opts;
  page.drawText(String(value ?? ""), {
    x,
    y,
    size,
    font: bold ? fonts.fontBold : fonts.font,
    color,
  });
}

export function drawRightText(page, fonts, value, rightX, y, size = 10, opts = {}) {
  const { bold = false, color = PDF_COLORS.ink } = opts;
  const f = bold ? fonts.fontBold : fonts.font;
  const text = String(value ?? "");
  const w = f.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y, size, font: f, color });
}

export function drawBoxedRow(page, x, y, width, height, { fill = false } = {}) {
  if (fill) {
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      color: PDF_COLORS.fill,
      borderColor: PDF_COLORS.line,
      borderWidth: 0.5,
    });
  } else {
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      borderColor: PDF_COLORS.line,
      borderWidth: 0.5,
    });
  }
}
