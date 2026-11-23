import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/token";
import { buildClassListPdf, getClassListData } from "@/lib/class-list";

export async function GET(request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const className = (searchParams.get("className") || "").trim().slice(0, 100);
  const status = ["active", "left", "all"].includes(searchParams.get("status"))
    ? searchParams.get("status")
    : "active";

  if (!className) {
    return new Response("Select a class to print.", { status: 400 });
  }

  const data = await getClassListData(className, status);
  const bytes = await buildClassListPdf(data);
  const safeClass = className.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const filename = `class-${safeClass}-${data.today.iso}.pdf`;

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
