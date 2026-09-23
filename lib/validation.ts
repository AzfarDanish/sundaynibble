import {
  FLAVOUR_IDS,
  PAYMENT_QR_IDS,
  calcTotals,
  type DeliveryLocationType,
  type FlavourId,
  type Gender,
  type Kamsis,
  type OrderItemInput,
  type PaymentMethod,
} from "./constants";

export interface OrderInput {
  customer_name: string;
  customer_phone: string;
  gender: Gender;
  kamsis: Kamsis;
  delivery_location_type: DeliveryLocationType;
  delivery_details: string;
  notes: string;
  items: OrderItemInput[];
  payment_method: PaymentMethod;
  receipt_url: string;
  pay_to: string;
}

export function normalizeGender(value: string): Gender | null {
  const v = value.trim().toLowerCase();
  if (v === "boy" || v === "male" || v === "lelaki") return "boy";
  if (v === "girl" || v === "female" || v === "perempuan") return "girl";
  return null;
}

export function validateOrderInput(body: unknown): {
  ok: boolean;
  error?: string;
  data?: OrderInput & { subtotal: number; cookedFee: number; deliveryFee: number; total: number; totalQuantity: number };
} {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid order data." };
  }
  const b = body as Record<string, unknown>;

  const customer_name = String(b.customer_name ?? "").trim();
  const customer_phone = String(b.customer_phone ?? "").trim();
  const gender = normalizeGender(String(b.gender ?? ""));
  const kamsis = String(b.kamsis ?? "").trim() as Kamsis;
  const delivery_location_type = String(b.delivery_location_type ?? "").trim() as DeliveryLocationType;
  const delivery_details = String(b.delivery_details ?? "").trim();
  const notes = String(b.notes ?? "").trim().slice(0, 500);
  const rawItems = Array.isArray(b.items) ? b.items : [];

  if (customer_name.length < 2 || customer_name.length > 100) {
    return { ok: false, error: "Please enter your name." };
  }
  const digits = customer_phone.replace(/\D/g, "");
  if (digits.length < 7 || customer_phone.length > 30) {
    return { ok: false, error: "Please enter a valid phone number." };
  }
  if (!gender) {
    return { ok: false, error: "Please choose Boy or Girl." };
  }
  if (
    kamsis !== "Kamsis Aisyah" &&
    kamsis !== "Kamsis Farabi" &&
    kamsis !== "Kamsis Khawarizmi"
  ) {
    return { ok: false, error: "Please choose your kamsis." };
  }
  if (
    delivery_location_type !== "cafeteria" &&
    delivery_location_type !== "lobby" &&
    delivery_location_type !== "door_to_door" &&
    delivery_location_type !== "other"
  ) {
    return { ok: false, error: "Please choose a delivery location." };
  }
  if (delivery_details.length < 1 || delivery_details.length > 300) {
    return { ok: false, error: "Please enter delivery details / room number." };
  }

  // Aisyah girl rule: no door-to-door (cafeteria, lobby, or other only)
  if (kamsis === "Kamsis Aisyah" && gender === "girl") {
    if (delivery_location_type === "door_to_door") {
      return {
        ok: false,
        error: "Sorry, no door-to-door delivery at Kamsis Aisyah. Please choose Cafeteria, Lobby, or Other.",
      };
    }
  }

  // Room prefix rules
  const firstChar = delivery_details.trim().charAt(0).toUpperCase();
  if (kamsis === "Kamsis Farabi" && firstChar !== "F") {
    return {
      ok: false,
      error: "For Kamsis Farabi, room number must start with F... (e.g. F101).",
    };
  }
  if (kamsis === "Kamsis Khawarizmi" && firstChar !== "K") {
    return {
      ok: false,
      error: "For Kamsis Khawarizmi, room number must start with K... (e.g. K205).",
    };
  }

  if (rawItems.length === 0) {
    return { ok: false, error: "Please choose at least 1 ramen." };
  }

  const items: OrderItemInput[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const flavour = String(r.flavour ?? "") as FlavourId;
    const quantity = Number(r.quantity);
    const cooked = Boolean(r.cooked);
    if (!FLAVOUR_IDS.includes(flavour)) continue;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return { ok: false, error: "Quantity must be between 1 and 20 per flavour." };
    }
    const existing = items.find((i) => i.flavour === flavour && i.cooked === cooked);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ flavour, quantity, cooked });
    }
  }

  if (items.length === 0) {
    return { ok: false, error: "Please choose at least 1 ramen." };
  }

  const totals = calcTotals(items);
  if (totals.totalQuantity > 50) {
    return { ok: false, error: "Maximum 50 packs per order." };
  }

  const payment_method = String(b.payment_method ?? "").trim() as PaymentMethod;
  if (payment_method !== "online" && payment_method !== "cod") {
    return { ok: false, error: "Please choose a payment method." };
  }
  const receipt_url = String(b.receipt_url ?? "").trim().slice(0, 1000);
  const pay_to = String(b.pay_to ?? "").trim().slice(0, 50);
  if (payment_method === "online") {
    if (!receipt_url || !/^https?:\/\/.+\..+/.test(receipt_url)) {
      return { ok: false, error: "Please upload your payment receipt." };
    }
    if (!PAYMENT_QR_IDS.includes(pay_to)) {
      return { ok: false, error: "Please choose which QR you paid to." };
    }
  }

  return {
    ok: true,
    data: {
      customer_name,
      customer_phone,
      gender,
      kamsis,
      delivery_location_type,
      delivery_details,
      notes,
      items,
      payment_method,
      receipt_url: payment_method === "online" ? receipt_url : "",
      pay_to: payment_method === "online" ? pay_to : "",
      subtotal: totals.subtotal,
      cookedFee: totals.cookedFee,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      totalQuantity: totals.totalQuantity,
    },
  };
}
