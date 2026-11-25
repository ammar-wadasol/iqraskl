"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

function sha256(value) {
  return createHash("sha256").update(value).digest();
}

function passwordMatches(password, expected) {
  if (!expected) return false;
  const a = sha256(password);
  const b = sha256(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function login(_prevState, formData) {
  const role = String(formData.get("role") ?? "admin") === "user" ? "user" : "admin";
  const expected =
    role === "user" ? process.env.USER_PASSWORD : process.env.ADMIN_PASSWORD;

  if (!expected) {
    return {
      error:
        role === "user"
          ? "USER_PASSWORD is not configured on the server."
          : "ADMIN_PASSWORD is not configured on the server.",
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password, expected)) {
    return { error: "Incorrect password." };
  }

  await createSession(role);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
