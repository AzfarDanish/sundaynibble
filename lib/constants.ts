export const BASE_PRICE = 5.5;
export const COOKED_FEE_PER_PACK = 1.0;
export const DELIVERY_FEE = 0;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export type PaymentMethod = "online" | "cod";

export interface PaymentQr {
  id: string;
  label: string;
  image: string;
}

// Carousel order: BigPay is the main/first QR.
export const PAYMENT_QRS: PaymentQr[] = [
  { id: "bigpay", label: "BigPay", image: "/assets/bigpay.jpg" },
  { id: "maybank", label: "Maybank", image: "/assets/maybank.png" },
  { id: "tng", label: "TNG", image: "/assets/tng.jpg" },
];

export const PAYMENT_QR_IDS = PAYMENT_QRS.map((q) => q.id);

export function paymentQrLabel(id: string): string {
  return PAYMENT_QRS.find((q) => q.id === id)?.label ?? id;
}

export type FlavourId = "carbonara" | "quattro_cheese" | "cheese";

export interface Flavour {
  id: FlavourId;
  label: string;
  image: string;
  description: string;
}

export const FLAVOURS: Flavour[] = [
  {
    id: "carbonara",
    label: "Carbonara",
    image: "/assets/carbonara.png",
    description: "Creamy carbonara Buldak",
  },
  {
    id: "quattro_cheese",
    label: "Quattro Cheese",
    image: "/assets/quattro cheese.png",
    description: "Four cheese Buldak",
  },
  {
    id: "cheese",
    label: "Cheese",
    image: "/assets/cheese.png",
    description: "Classic cheese Buldak",
  },
];

export const FLAVOUR_IDS: FlavourId[] = ["carbonara", "quattro_cheese", "cheese"];

export const FLAVOUR_LABELS: Record<FlavourId, string> = {
  carbonara: "Carbonara",
  quattro_cheese: "Quattro Cheese",
  cheese: "Cheese",
};

export const KAMSIS_LIST = [
  "Kamsis Aisyah",
  "Kamsis Farabi",
  "Kamsis Khawarizmi",
] as const;

export type Kamsis = (typeof KAMSIS_LIST)[number];

export type Gender = "boy" | "girl";

export type DeliveryLocationType = "cafeteria" | "lobby" | "door_to_door" | "other";

export const HERO_IMAGE = "/assets/hero%20image.png";

export interface OrderItemInput {
  flavour: FlavourId;
  quantity: number;
  cooked: boolean;
}

export function formatRM(value: number): string {
  return `RM${value.toFixed(2)}`;
}

// Prices in sen (integer cents) — the single source of truth for money math.
// All totals are accumulated as integers so results are exact (no 0.1+0.2 drift);
// RM values are derived only at the boundary for display/storage.
export const BASE_PRICE_SEN = 550;
export const COOKED_FEE_PER_PACK_SEN = 100;
export const DELIVERY_FEE_SEN = 0;

const senToRm = (sen: number): number => sen / 100;

export function calcTotals(items: OrderItemInput[]): {
  subtotal: number;
  cookedFee: number;
  deliveryFee: number;
  total: number;
  totalQuantity: number;
} {
  let totalQuantity = 0;
  let subtotalSen = 0;
  let cookedFeeSen = 0;
  for (const item of items) {
    const q = Math.trunc(item.quantity);
    totalQuantity += q;
    subtotalSen += q * BASE_PRICE_SEN;
    if (item.cooked) {
      cookedFeeSen += q * COOKED_FEE_PER_PACK_SEN;
    }
  }
  const deliveryFeeSen = DELIVERY_FEE_SEN;
  return {
    subtotal: senToRm(subtotalSen),
    cookedFee: senToRm(cookedFeeSen),
    deliveryFee: senToRm(deliveryFeeSen),
    total: senToRm(subtotalSen + cookedFeeSen + deliveryFeeSen),
    totalQuantity,
  };
}
