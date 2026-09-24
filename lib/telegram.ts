import { FLAVOUR_LABELS, formatRM, paymentQrLabel, type OrderItemInput } from "./constants";

export interface TelegramOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  gender: string;
  kamsis: string;
  delivery_location_type: string;
  delivery_details: string;
  notes: string;
  items: OrderItemInput[];
  total: number;
  payment_method: string;
  receipt_url: string;
  pay_to: string;
}

function deliveryLabel(value: string): string {
  if (value === "door_to_door") return "Door to door";
  if (value === "cafeteria") return "Cafeteria";
  if (value === "lobby") return "Lobby";
  if (value === "other") return "Other";
  return value;
}

export function buildTelegramMessage(order: TelegramOrder): string {
  const lines: string[] = [];
  lines.push("New Sunday Nibble order");
  lines.push("");
  lines.push(`Customer: ${order.customer_name}`);
  lines.push(`Phone: ${order.customer_phone}`);
  lines.push(`Gender: ${order.gender === "boy" ? "Boy" : "Girl"}`);
  lines.push(`Kamsis: ${order.kamsis}`);
  lines.push(
    `Delivery: ${deliveryLabel(order.delivery_location_type)}, ${order.delivery_details}`
  );
  lines.push("");
  lines.push("Items:");
  for (const item of order.items) {
    const label = FLAVOUR_LABELS[item.flavour] ?? item.flavour;
    lines.push(
      `- ${label} x${item.quantity}${item.cooked ? " (cooked)" : ""} · ${item.spice}% spicy`
    );
    if (item.note) {
      lines.push(`  Note: ${item.note}`);
    }
  }
  lines.push("");
  lines.push(`Total: ${formatRM(order.total)}`);
  lines.push(
    `Payment: ${order.payment_method === "cod" ? "Cash on Delivery" : `Online · ${paymentQrLabel(order.pay_to)}`}`
  );
  if (order.receipt_url) {
    lines.push(`Receipt: ${order.receipt_url}`);
  }
  if (order.notes) {
    lines.push(`Notes: ${order.notes}`);
  }
  lines.push(`Order ID: ${order.id}`);
  return lines.join("\n");
}

export async function sendTelegramMessage(
  text: string
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  if (!token || !chatId) {
    console.warn("Telegram not configured, skipping notification");
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Telegram send failed", res.status, body);
      return { ok: false, skipped: false, error: body };
    }
    return { ok: true, skipped: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Telegram send error", msg);
    return { ok: false, skipped: false, error: msg };
  }
}
