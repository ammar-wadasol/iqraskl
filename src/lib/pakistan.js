// Pakistani mobile: 03XXXXXXXXX (11 digits).
export const PK_PHONE_REGEX = /^03\d{9}$/;
export const PK_PHONE_HINT = "Format: 03XXXXXXXXX (11 digits)";

// CNIC: 13 digits, usually written as 12345-1234567-1.
export const PK_CNIC_REGEX = /^\d{5}-\d{7}-\d$/;
export const PK_CNIC_HINT = "Format: 12345-1234567-1";

export function normalizeCnic(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 13) return String(value ?? "").trim();
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function formatCnicInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function formatPhoneInput(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}
