import "server-only";
import { connectDB } from "./db";
import { getToday } from "./dates";
import { Student } from "./models/Student";
import {
  buildSiblingFeeStatementPdf,
  getFeeStatementData,
} from "./fees-statement";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function studentQuery(filters) {
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

/** Build 4-up challan PDF bytes for all students matching fees filters. */
export async function buildFilteredChallansPdf(filters) {
  await connectDB();
  const docs = await Student.find(studentQuery(filters))
    .collation({ locale: "en", numericOrdering: true })
    .sort({ studentId: 1 })
    .select("_id")
    .lean();

  if (!docs.length) return null;

  const statements = (
    await Promise.all(docs.map((doc) => getFeeStatementData(String(doc._id))))
  ).filter((data) => data && data.amountPayable > 0);
  if (!statements.length) return null;

  // Reuses the proven sibling 4-up builder (one challan per student when count > 1).
  const bytes = await buildSiblingFeeStatementPdf(statements);
  const today = statements[0]?.today ?? getToday();
  return { bytes, today, count: statements.length };
}
