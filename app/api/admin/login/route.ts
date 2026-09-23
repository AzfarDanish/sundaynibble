import { cookies } from "next/headers";
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, getAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const password = String(body.password ?? "");
  const expected = getAdminPassword();
  if (!expected || password !== expected) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return Response.json({ ok: true });
}
