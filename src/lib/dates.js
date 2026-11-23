import "server-only";

// "Today" in the school's timezone, as plain numbers plus a YYYY-MM-DD string.
export function getToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const year = Number(get("year"));
  const month = Number(get("month"));
  return { year, month, iso: `${get("year")}-${get("month")}-${get("day")}` };
}

export function parseISODate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}