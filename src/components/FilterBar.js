import Form from "next/form";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { CLASS_OPTIONS } from "@/lib/classes";

// GET form: filters live in the URL so they survive pagination and refresh.
export default function FilterBar({ action, filters, extra = {} }) {
  const resetKey = JSON.stringify(filters);

  return (
    <Form key={resetKey} action={action} className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {Object.entries(extra).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div>
        <label htmlFor="f-name" className="label">Student name</label>
        <input id="f-name" name="name" defaultValue={filters.name} className="input" placeholder="Search name" />
      </div>
      <div>
        <label htmlFor="f-sid" className="label">Student ID</label>
        <input id="f-sid" name="studentId" defaultValue={filters.studentId} className="input" placeholder="Search ID" />
      </div>
      <div>
        <label htmlFor="f-father" className="label">Father name</label>
        <input id="f-father" name="fatherName" defaultValue={filters.fatherName} className="input" placeholder="Search father name" />
      </div>
      <div>
        <label htmlFor="f-class" className="label">Class</label>
        <select id="f-class" name="className" defaultValue={filters.className || ""} className="input">
          <option value="">All classes</option>
          {CLASS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-status" className="label">Status</label>
        <select id="f-status" name="status" defaultValue={filters.status} className="input">
          <option value="active">Active</option>
          <option value="left">Left school</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="flex items-end gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          <Search className="size-4" aria-hidden="true" />
          Search
        </button>
        <Link href={{ pathname: action, query: extra }} className="btn" aria-label="Clear filters" title="Clear filters">
          <X className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Form>
  );
}
