export const BASE_PRICE = 5.5;
export const COOKED_FEE_PER_PACK = 1.0;
export const DELIVERY_FEE = 0;
export const BANK_QR_IMAGE = "/sundaynibble/assets/bank-qr.jpg";
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export type PaymentMethod = "online" | "cod";

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
    image: "/sundaynibble/assets/carbonara.png",
    description: "Creamy carbonara Buldak",
  },
  {
    id: "quattro_cheese",
    label: "Quattro Cheese",
    image: "/sundaynibble/assets/quattro cheese.png",
    description: "Four cheese Buldak",
  },
  {
    id: "cheese",
    label: "Cheese",
    image: "/sundaynibble/assets/cheese.png",
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

export const HERO_IMAGE = "/sundaynibble/assets/hero%20image.png";

export interface OrderItemInput {
  flavour: FlavourId;
  quantity: number;
  cooked: boolean;
}

export function formatRM(value: number): string {
  return `RM${value.toFixed(2)}`;
}

export function calcTotals(items: OrderItemInput[]): {
  subtotal: number;
  cookedFee: number;
  deliveryFee: number;
  total: number;
  totalQuantity: number;
} {
  let totalQuantity = 0;
  let subtotal = 0;
  let cookedFee = 0;
  for (const item of items) {
    totalQuantity += item.quantity;
    subtotal += item.quantity * BASE_PRICE;
    if (item.cooked) {
      cookedFee += item.quantity * COOKED_FEE_PER_PACK;
    }
  }
  const deliveryFee = DELIVERY_FEE;
  const total = subtotal + cookedFee + deliveryFee;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cookedFee: Math.round(cookedFee * 100) / 100,
    deliveryFee,
    total: Math.round(total * 100) / 100,
    totalQuantity,
  };
}
