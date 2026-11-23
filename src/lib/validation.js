import { z } from "zod";
import { normalizeCnic, PK_CNIC_REGEX, PK_PHONE_HINT, PK_CNIC_HINT, PK_PHONE_REGEX } from "./pakistan";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Enter a valid date.");

export const amount = z.coerce
  .number({ error: "Enter an amount." })
  .int("Amount must be a whole number.")
  .min(0, "Amount cannot be negative.")
  .max(10_000_000, "Amount is too large.");

export const positiveAmount = amount.refine((v) => v > 0, "Amount must be more than 0.");

export const requiredText = (label, max = 100) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const optionalText = (max = 200) => z.string().trim().max(max).optional().default("");

export const pakistanPhone = z
  .string()
  .trim()
  .refine((v) => PK_PHONE_REGEX.test(v), { message: PK_PHONE_HINT });

export const pakistanCnic = z
  .string()
  .trim()
  .transform((v) => normalizeCnic(v))
  .refine((v) => PK_CNIC_REGEX.test(v), { message: PK_CNIC_HINT });

export function firstError(result) {
  return result.error.issues[0]?.message ?? "Invalid input.";
}

export function formValues(formData, keys) {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k) ?? undefined]));
}
