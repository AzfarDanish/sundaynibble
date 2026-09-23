import { getStoreSettings, getStoreState, isStoreOpen } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getStoreSettings();
  return Response.json({
    is_available: settings.is_available,
    accepting_orders: settings.accepting_orders,
    open_time: settings.open_time,
    close_time: settings.close_time,
    status_message: settings.status_message,
    state: getStoreState(settings),
    is_open: isStoreOpen(settings),
  });
}
