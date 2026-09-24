"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  FLAVOUR_LABELS,
  SELLER_BANK_ACCOUNT,
  SELLER_NAME,
  SELLER_PHONE,
  SELLER_PHONE_INTL,
  formatRM,
  paymentQrLabel,
} from "@/lib/constants";
import { loadOrderSnapshot, type OrderSnapshot } from "@/lib/orderSnapshot";

interface ViewModel {
  orderId: string;
  createdAt: string;
  customer_name: string;
  customer_phone: string;
  kamsis: string;
  deliveryLabel: string;
  delivery_details: string;
  notes: string;
  items: { flavour: string; quantity: number; cooked: boolean; spice?: string; note?: string }[];
  subtotal: number;
  cookedFee: number;
  total: number;
  payment_method: string;
  receipt_url: string;
  pay_to: string;
}

function deliveryLabelOf(v: string): string {
  if (v === "door_to_door") return "Door to door";
  if (v === "cafeteria") return "Cafeteria";
  if (v === "lobby") return "Lobby";
  if (v === "other") return "Other";
  return v;
}

function fromSnapshot(s: OrderSnapshot): ViewModel {
  return {
    orderId: s.orderId,
    createdAt: s.createdAt,
    customer_name: s.customer_name,
    customer_phone: s.customer_phone,
    kamsis: s.kamsis,
    deliveryLabel: deliveryLabelOf(s.delivery_location_type),
    delivery_details: s.delivery_details,
    notes: s.notes,
    items: s.items,
    subtotal: s.subtotal,
    cookedFee: s.cookedFee,
    total: s.total,
    payment_method: s.payment_method,
    receipt_url: s.receipt_url,
    pay_to: s.pay_to,
  };
}

function fromServer(o: Record<string, unknown>): ViewModel {
  const items = Array.isArray(o.items) ? (o.items as ViewModel["items"]) : [];
  return {
    orderId: String(o.id ?? ""),
    createdAt: String(o.created_at ?? ""),
    customer_name: String(o.customer_name ?? ""),
    customer_phone: String(o.customer_phone ?? ""),
    kamsis: String(o.kamsis ?? ""),
    deliveryLabel: deliveryLabelOf(String(o.delivery_location_type ?? "")),
    delivery_details: String(o.delivery_details ?? ""),
    notes: String(o.notes ?? ""),
    items,
    subtotal: Number(o.subtotal ?? 0),
    cookedFee: Number(o.cooked_fee ?? 0),
    total: Number(o.total ?? 0),
    payment_method: String(o.payment_method ?? ""),
    receipt_url: String(o.receipt_url ?? ""),
    pay_to: String(o.pay_to ?? ""),
  };
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const reduceMotion = useReducedMotion() ?? false;
  const spring = reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.4 } as const;
  const [order, setOrder] = useState<ViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.order) {
            setOrder(fromServer(data.order));
            return;
          }
        }
      } catch {
        // fall through to snapshot
      }
      if (!cancelled) {
        const snap = loadOrderSnapshot(id);
        setOrder(snap ? fromSnapshot(snap) : null);
      }
    }
    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const receiptIsPdf =
    order?.receipt_url.toLowerCase().endsWith(".pdf") ?? false;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-10 pt-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">
        Sunday Nibble
      </p>
      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading your order…</p>
      ) : !order ? (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={spring}
        >
          <h1 className="display-tight mt-2 text-3xl font-extrabold text-zinc-900">
            Order received!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We couldn&apos;t pull up the details for this order on this device. If you just
            ordered, it went through — contact {SELLER_NAME} below if you need anything.
          </p>
          <SellerCard />
          <BackHome />
        </motion.div>
      ) : (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={spring}
        >
          <h1 className="display-tight mt-2 text-3xl font-extrabold text-zinc-900">
            Order received!
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Order ID
            <span className="block break-all font-mono text-xs font-bold text-zinc-700">
              {order.orderId}
            </span>
            {order.createdAt
              ? new Date(order.createdAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })
              : ""}
          </p>

          <section aria-label="Order items" className="mt-6 border-t border-zinc-200 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Your ramen
            </h2>
            <ul className="mt-2 divide-y divide-zinc-100 text-sm leading-relaxed text-zinc-700">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-2 py-1.5">
                  <span className="min-w-0 break-words">
                    {(FLAVOUR_LABELS as Record<string, string>)[i.flavour] || i.flavour} x
                    {i.quantity}
                    {i.cooked ? ` · cooked · ${i.spice || "100"}%` : ""}
                    {i.note ? (
                      <span className="block text-xs text-zinc-500">“{i.note}”</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatRM(i.quantity * 5.5 + (i.cooked ? i.quantity * 1 : 0))}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatRM(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>Cooked fee</dt>
                <dd className="tabular-nums">{formatRM(order.cookedFee)}</dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>Delivery</dt>
                <dd>FREE</dd>
              </div>
              <div className="flex justify-between pt-1 text-lg font-extrabold">
                <dt>Total</dt>
                <dd className="text-red-600 tabular-nums">{formatRM(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section aria-label="Payment" className="mt-6 border-t border-zinc-200 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Payment</h2>
            <p className="mt-2 text-sm text-zinc-700">
              {order.payment_method === "cod"
                ? "Cash on delivery — prepare your cash when we arrive."
                : `Paid online via ${paymentQrLabel(order.pay_to)} (account: ${SELLER_BANK_ACCOUNT}).`}
            </p>
            {order.receipt_url && (
              <div className="mt-3">
                <a
                  href={order.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable block border border-zinc-200 p-3 text-center text-sm font-bold text-red-600"
                >
                  View your receipt{receiptIsPdf ? " (PDF)" : ""}
                </a>
              </div>
            )}
          </section>

          <section aria-label="Delivery" className="mt-6 border-t border-zinc-200 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Delivering to
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {order.customer_name} · {order.customer_phone}
              <span className="block text-zinc-500">
                {order.kamsis} · {order.deliveryLabel}
                {order.delivery_details ? ` · ${order.delivery_details}` : ""}
              </span>
              {order.notes ? <span className="block text-zinc-500">Note: {order.notes}</span> : null}
            </p>
          </section>

          <SellerCard />
          <BackHome />
        </motion.div>
      )}
    </main>
  );
}

function SellerCard() {
  return (
    <section aria-label="Contact seller" className="mt-6 border-t-2 border-red-600 pt-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Need me? Contact
      </h2>
      <p className="mt-2 text-base font-extrabold text-zinc-900">{SELLER_NAME}</p>
      <a
        href={`tel:+${SELLER_PHONE_INTL}`}
        className="pressable mt-1 block text-sm font-bold text-red-600"
      >
        {SELLER_PHONE}
      </a>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <a
          href={`tel:+${SELLER_PHONE_INTL}`}
          className="pressable border border-zinc-300 px-4 py-3 text-center text-sm font-bold text-zinc-800 active:bg-zinc-100"
        >
          Call me
        </a>
        <a
          href={`https://wa.me/${SELLER_PHONE_INTL}?text=${encodeURIComponent("Hi! I just ordered Sunday Nibble ramen.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable bg-red-600 px-4 py-3 text-center text-sm font-bold text-white"
        >
          WhatsApp
        </a>
      </div>
    </section>
  );
}

function BackHome() {
  return (
    <Link
      href="/"
      className="pressable mt-6 block text-center text-sm font-bold text-zinc-500"
    >
      ← Back to ordering
    </Link>
  );
}
