import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/token";
import { buildFeeStatementPdf, getFeeStatementData } from "@/lib/fees-statement";

export async function GET(_request, { params }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const data = await getFeeStatementData(id);
  if (!data) {
    return new Response("Student not found", { status: 404 });
  }

  const bytes = await buildFeeStatementPdf(data);
  const filename = `fee-challan-${data.student.studentId}-${data.today.iso}.pdf`;

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
