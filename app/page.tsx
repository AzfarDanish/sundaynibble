import OrderForm from "@/components/OrderForm";
import { getStoreSettings, isStoreOpen } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getStoreSettings();
  return (
    <main className="min-h-full bg-white">
      <OrderForm
        initial={{
          is_available: settings.is_available,
          open_time: settings.open_time,
          close_time: settings.close_time,
          status_message: settings.status_message,
          is_open: isStoreOpen(settings),
        }}
      />
      <footer className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-400">
        Sunday Nibble · Samyang Buldak · sebataresources.com/sundaynibble
      </footer>
    </main>
  );
}
