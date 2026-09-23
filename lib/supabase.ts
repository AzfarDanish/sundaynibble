import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getUrl(): string {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://btyfwtssyljcyplshnat.supabase.co"
  );
}

function getAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function getSupabaseAnonClient(): SupabaseClient {
  return createClient(getUrl(), getAnonKey(), {
    auth: { persistSession: false },
  });
}

export function getSupabaseAdminClient(): SupabaseClient {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (serviceRole) {
    return createClient(getUrl(), serviceRole, {
      auth: { persistSession: false },
    });
  }
  // Fallback to anon key. Note: anon cannot SELECT orders due to RLS.
  // Add SUPABASE_SERVICE_ROLE_KEY in .env.local for full admin reads.
  return getSupabaseAnonClient();
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
