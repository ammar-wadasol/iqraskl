"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

function sha256(value) {
  return createHash("sha256").update(value).digest();
}

export async function login(_prevState, formData) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { error: "ADMIN_PASSWORD is not configured on the server." };
  }

  const password = String(formData.get("password") ?? "");
  if (!timingSafeEqual(sha256(password), sha256(expected))) {
    return { error: "Incorrect password." };
  }

  await createSession();
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
