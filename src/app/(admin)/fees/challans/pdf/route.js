import { cookies } from "next/headers";
import { parseFeeFilters } from "@/lib/data";
import { buildFilteredChallansPdf } from "@/lib/fees-batch";
import { SESSION_COOKIE, verifyToken } from "@/lib/token";

export async function GET(request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters = parseFeeFilters(Object.fromEntries(searchParams.entries()));
  const result = await buildFilteredChallansPdf(filters);
  if (!result) {
    return new Response("No students match these filters.", { status: 404 });
  }

  const classPart = filters.className
    ? filters.className.replace(/\s+/g, "-").toLowerCase()
    : "all";
  const filename = `fee-challans-${classPart}-${result.today.iso}.pdf`;

  return new Response(Buffer.from(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
