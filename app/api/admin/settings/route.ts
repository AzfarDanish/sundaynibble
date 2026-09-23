import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return isAdminCookieValid(store.get(ADMIN_COOKIE_NAME)?.value);
}

function validTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}

export async function GET() {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", "main")
    .single();
  if (error || !data) {
    return Response.json({ error: "Failed to load settings." }, { status: 500 });
  }
  return Response.json(data);
}

export async function PUT(request: Request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const is_available = Boolean(body.is_available);
  const open_time = validTime(body.open_time);
  const close_time = validTime(body.close_time);
  const status_message = String(body.status_message ?? "").slice(0, 300);
  if (!open_time || !close_time) {
    return Response.json({ error: "Use HH:MM format for open/close time." }, { status: 400 });
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_settings")
    .update({
      is_available,
      open_time,
      close_time,
      status_message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "main")
    .select("*")
    .single();
  if (error || !data) {
    console.error("Settings update failed", error?.message);
    return Response.json(
      {
        error:
          "Failed to update settings. If reads work but writes fail, add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
      },
      { status: 500 }
    );
  }
  return Response.json(data);
}
