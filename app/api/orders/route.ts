import { randomUUID } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getStoreSettings, getStoreState } from "@/lib/store";
import { buildTelegramMessage, sendTelegramMessage } from "@/lib/telegram";
import { validateOrderInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validated = validateOrderInput(body);
  if (!validated.ok || !validated.data) {
    return Response.json({ error: validated.error || "Invalid order." }, { status: 400 });
  }
  const data = validated.data;

  const settings = await getStoreSettings();
  const state = getStoreState(settings);
  if (state === "paused") {
    return Response.json(
      {
        error:
          settings.status_message ||
          "Sorry, we're not taking orders right now. Please check back soon.",
      },
      { status: 403 }
    );
  }
  if (state === "closed") {
    const msg =
      settings.status_message ||
      `Sorry, we are closed. Selling hours ${settings.open_time.slice(0, 5)}–${settings.close_time.slice(0, 5)}.`;
    return Response.json({ error: msg }, { status: 403 });
  }

  // Use admin client (service_role when configured, else anon).
  // Anon has INSERT-only RLS (no SELECT), so pre-generate the id and
  // insert without a RETURNING select to avoid needing a SELECT policy.
  const orderId = randomUUID();
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("orders").insert({
    id: orderId,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    gender: data.gender,
    kamsis: data.kamsis,
    delivery_location_type: data.delivery_location_type,
    delivery_details: data.delivery_details,
    notes: data.notes,
    items: data.items,
    subtotal: data.subtotal,
    cooked_fee: data.cookedFee,
    delivery_fee: data.deliveryFee,
    total: data.total,
    payment_method: data.payment_method,
    receipt_url: data.receipt_url,
    pay_to: data.pay_to,
    status: "new",
  });

  if (error) {
    console.error("Order insert failed", error.message);
    return Response.json({ error: "Failed to save order. Please try again." }, { status: 500 });
  }

  const text = buildTelegramMessage({
    id: orderId,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    gender: data.gender,
    kamsis: data.kamsis,
    delivery_location_type: data.delivery_location_type,
    delivery_details: data.delivery_details,
    notes: data.notes,
    items: data.items,
    total: data.total,
    payment_method: data.payment_method,
    receipt_url: data.receipt_url,
    pay_to: data.pay_to,
  });

  const telegram = await sendTelegramMessage(text);

  return Response.json(
    {
      ok: true,
      orderId,
      total: data.total,
      telegramSent: telegram.ok,
      telegramSkipped: telegram.skipped,
    },
    { status: 201 }
  );
}
