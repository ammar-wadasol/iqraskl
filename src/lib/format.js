export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const moneyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  return moneyFormatter.format(value || 0);
}

const compactMoneyFormatter = new Intl.NumberFormat("en-PK", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoneyCompact(value) {
  return compactMoneyFormatter.format(value || 0);
}

// All stored dates are date-only values at UTC midnight.
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "";
}

export function toISODate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function monthLabel(year, month) {
  return `${MONTHS[month - 1]} ${year}`;
}
