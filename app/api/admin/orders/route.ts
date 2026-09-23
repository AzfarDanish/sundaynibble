import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from "@/lib/auth";
import { getSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = ["new", "accepted", "preparing", "delivered", "cancelled"];

async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return isAdminCookieValid(store.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(request: Request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasServiceRoleKey()) {
    return Response.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local to let admin read orders (anon key is blocked by RLS for SELECT).",
      },
      { status: 500 }
    );
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 200);

  const supabase = getSupabaseAdminClient();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(limit);
  if (status && ALLOWED_STATUS.includes(status)) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Admin orders fetch failed", error.message);
    return Response.json({ error: "Failed to load orders." }, { status: 500 });
  }
  return Response.json({ orders: data ?? [] });
}

export async function PATCH(request: Request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasServiceRoleKey()) {
    return Response.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local." },
      { status: 500 }
    );
  }
  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !ALLOWED_STATUS.includes(status)) {
    return Response.json({ error: "Invalid id or status." }, { status: 400 });
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();
  if (error || !data) {
    console.error("Order status update failed", error?.message);
    return Response.json({ error: "Failed to update order." }, { status: 500 });
  }
  return Response.json({ ok: true, order: data });
}
