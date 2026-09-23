import { getStoreSettings, isStoreOpen } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getStoreSettings();
  return Response.json({
    is_available: settings.is_available,
    open_time: settings.open_time,
    close_time: settings.close_time,
    status_message: settings.status_message,
    is_open: isStoreOpen(settings),
  });
}
