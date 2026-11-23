import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Loading from "@/components/Loading";
import StudentForm from "@/components/StudentForm";
import { getToday } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Add student · Iqra School Office" };

export default function NewStudentPage() {
  return (
    <>
      <div>
        <Link href="/students" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Students
        </Link>
        <h1 className="text-xl font-semibold">Add student</h1>
      </div>
      <div className="card">
        <Suspense fallback={<Loading />}>
          <NewStudentForm />
        </Suspense>
      </div>
    </>
  );
}

async function NewStudentForm() {
  await requireAdmin();
  return <StudentForm today={getToday().iso} />;
}
