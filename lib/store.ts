import { getSupabaseAnonClient } from "./supabase";

export interface StoreSettings {
  id: string;
  is_available: boolean;
  open_time: string; // "17:00:00"
  close_time: string; // "23:30:00"
  status_message: string;
  updated_at: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  id: "main",
  is_available: true,
  open_time: "17:00:00",
  close_time: "23:30:00",
  status_message: "",
  updated_at: new Date().toISOString(),
};

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", "main")
      .single();
    if (error || !data) {
      console.warn("Failed to load store settings, using defaults", error?.message);
      return DEFAULT_SETTINGS;
    }
    return data as StoreSettings;
  } catch (err) {
    console.warn("Store settings fetch error", err);
    return DEFAULT_SETTINGS;
  }
}

function toMinutes(time: string): number {
  const parts = time.split(":").map((p) => parseInt(p, 10));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

export function getMalaysiaNow(): Date {
  // Convert current time to Asia/Kuala_Lumpur wall time
  const now = new Date();
  const myString = now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" });
  return new Date(myString);
}

export function isWithinSellingHours(
  openTime: string,
  closeTime: string,
  now: Date = getMalaysiaNow()
): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  if (open === close) return true;
  if (close > open) {
    return nowMinutes >= open && nowMinutes <= close;
  }
  // Overnight range, e.g. 17:00-02:00
  return nowMinutes >= open || nowMinutes <= close;
}

export function isStoreOpen(settings: StoreSettings, now: Date = getMalaysiaNow()): boolean {
  if (!settings.is_available) return false;
  return isWithinSellingHours(settings.open_time, settings.close_time, now);
}
