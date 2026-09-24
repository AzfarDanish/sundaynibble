import type { OrderItemInput } from "./constants";

export interface OrderSnapshot {
  orderId: string;
  createdAt: string;
  customer_name: string;
  customer_phone: string;
  gender: string;
  kamsis: string;
  delivery_location_type: string;
  delivery_details: string;
  notes: string;
  items: OrderItemInput[];
  subtotal: number;
  cookedFee: number;
  deliveryFee: number;
  total: number;
  payment_method: string;
  receipt_url: string;
  pay_to: string;
}

const KEY = "sn_last_order";

export function saveOrderSnapshot(snap: OrderSnapshot): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    // private mode etc. — confirmation page falls back to server fetch
  }
}

export function loadOrderSnapshot(orderId: string): OrderSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as OrderSnapshot;
    return snap.orderId === orderId ? snap : null;
  } catch {
    return null;
  }
}
