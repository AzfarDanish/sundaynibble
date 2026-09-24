"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FLAVOUR_LABELS, formatRM, paymentQrLabel } from "@/lib/constants";

interface Settings {
  is_available: boolean;
  accepting_orders: boolean;
  open_time: string;
  close_time: string;
  status_message: string;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  gender: string;
  kamsis: string;
  delivery_location_type: string;
  delivery_details: string;
  notes: string;
  items: { flavour: string; quantity: number; cooked: boolean; spice?: string; note?: string }[];
  subtotal: number;
  cooked_fee: number;
  total: number;
  status: string;
  payment_method: string;
  receipt_url: string;
  pay_to: string;
}

const STATUS = ["new", "accepted", "preparing", "delivered", "cancelled"];

function statusStyle(status: string): string {
  switch (status) {
    case "new":
      return "bg-red-100 text-red-700";
    case "accepted":
      return "bg-amber-100 text-amber-800";
    case "preparing":
      return "bg-blue-100 text-blue-800";
    case "delivered":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-zinc-200 text-zinc-600";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

function deliveryLabelOf(value: string): string {
  if (value === "door_to_door") return "Door to door";
  if (value === "cafeteria") return "Cafeteria";
  if (value === "lobby") return "Lobby";
  if (value === "other") return "Other";
  return value;
}

// "17:00:00" -> "5:00 PM" — plain preview so the admin sees the result.
function toDisplayTime(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = Number(m[1]);
  const min = m[2];
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${suffix}`;
}

export default function AdminDashboard() {
  const reduceMotion = useReducedMotion() ?? false;
  const spring = reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.4 } as const;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const [sRes, oRes] = await Promise.all([
        fetch("/api/admin/settings", { cache: "no-store" }),
        fetch(`/api/admin/orders?limit=100${filter ? `&status=${filter}` : ""}`, {
          cache: "no-store",
        }),
      ]);
      const sData = await sRes.json();
      const oData = await oRes.json();
      if (!sRes.ok) {
        setError(sData.error || "Failed to load settings.");
        return;
      }
      setSettings(sData);
      if (!oRes.ok) {
        setError(oData.error || "Failed to load orders.");
        setOrders([]);
        return;
      }
      setOrders(oData.orders ?? []);
    } catch {
      setError("Network error loading admin data.");
    }
  }

  useEffect(() => {
    // Data fetch on filter change; setState happens in async callbacks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        return;
      }
      setSettings(data);
    } catch {
      setError("Network error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update order.");
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch {
      setError("Network error updating order.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-zinc-900">Sunday Nibble Admin</h1>
        <button
          onClick={logout}
          className="pressable border-b border-zinc-300 px-1 py-1.5 text-xs font-bold text-zinc-700 hover:text-red-600"
        >
          Logout
        </button>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {error && (
          <motion.p
            key={error}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={spring}
            role="alert"
            className="mt-4 border-l-2 border-red-600 pl-3 text-xs font-semibold leading-relaxed text-red-700"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <section className="mt-6 border-t border-zinc-200 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Availability</h2>
        {!settings ? (
          <p className="mt-2 text-xs text-zinc-500">Loading…</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={settings.is_available}
                onChange={(e) => setSettings({ ...settings, is_available: e.target.checked })}
                className="h-4 w-4 accent-red-600"
              />
              Available (store open indicator)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={settings.accepting_orders ?? true}
                onChange={(e) => setSettings({ ...settings, accepting_orders: e.target.checked })}
                className="h-4 w-4 accent-red-600"
              />
              Taking orders right now
            </label>
            <label className="block text-xs font-semibold text-zinc-700">
              Status message
              <input
                value={settings.status_message}
                onChange={(e) => setSettings({ ...settings, status_message: e.target.value })}
                placeholder="e.g. Sold out today"
                maxLength={300}
                className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-sm font-normal outline-none focus:border-red-600"
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-700">
              Opens at
              <input
                type="time"
                step={60}
                value={settings.open_time.slice(0, 5)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setSettings({ ...settings, open_time: `${e.target.value}:00` });
                }}
                className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base font-normal outline-none focus:border-red-600"
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-700">
              Closes at
              <input
                type="time"
                step={60}
                value={settings.close_time.slice(0, 5)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setSettings({ ...settings, close_time: `${e.target.value}:00` });
                }}
                className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base font-normal outline-none focus:border-red-600"
              />
            </label>
            <p className="text-xs leading-relaxed text-zinc-500 sm:col-span-2">
              Customers will see: selling {toDisplayTime(settings.open_time)} –{" "}
              {toDisplayTime(settings.close_time)} daily
              {!settings.is_available
                ? " (currently hidden — Available is off)"
                : !settings.accepting_orders
                  ? " (currently paused — Taking orders is off)"
                  : ""}
              . Tap the field above to pick a time — no typing needed.
            </p>
            <div className="sm:col-span-2">
              <motion.button
                onClick={saveSettings}
                whileTap={reduceMotion || saving ? undefined : { scale: 0.97 }}
                transition={spring}
                disabled={saving}
                className="pressable bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:bg-zinc-300"
              >
                {saving ? "Saving…" : "Save availability"}
              </motion.button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 border-t border-zinc-200 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Latest orders ({orders.length})</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-b border-zinc-300 bg-transparent px-1 py-1.5 text-xs"
          >
            <option value="">All</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
          {orders.map((o) => (
            <motion.article
              key={o.id}
              layout={reduceMotion ? undefined : "position"}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={spring}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm"
            >
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${statusStyle(o.status)}`}
                >
                  {o.status}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {new Date(o.created_at).toLocaleString("en-MY", {
                    timeZone: "Asia/Kuala_Lumpur",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="space-y-2 px-3 py-3">
                <div>
                  <p className="font-extrabold text-zinc-900">{o.customer_name}</p>
                  <a
                    href={`tel:${o.customer_phone.replace(/\D/g, "")}`}
                    className="text-xs font-bold text-red-600"
                  >
                    {o.customer_phone}
                  </a>
                  <p className="mt-0.5 text-xs capitalize text-zinc-500">
                    {o.gender} · {o.kamsis}
                  </p>
                </div>
                <div className="border-t border-zinc-100 pt-2">
                  <p className="text-xs font-bold text-zinc-700">
                    {deliveryLabelOf(o.delivery_location_type)}
                    <span className="font-normal text-zinc-500"> · {o.delivery_details}</span>
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-zinc-700">
                    {(o.items || []).map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="min-w-0">
                          {(FLAVOUR_LABELS as Record<string, string>)[i.flavour] || i.flavour}{" "}
                          x{i.quantity}
                          {i.cooked ? ` · cooked${i.spice ? ` · ${i.spice}%` : ""}` : ""}
                          {i.note ? (
                            <span className="block text-zinc-500">“{i.note}”</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {o.notes && <p className="mt-1 text-xs text-zinc-500">Note: {o.notes}</p>}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                  <div className="text-xs text-zinc-600">
                    <p className="font-bold text-zinc-800">
                      {o.payment_method === "cod"
                        ? "Cash on delivery"
                        : `Online · ${paymentQrLabel(o.pay_to || "")}`}
                    </p>
                    {o.receipt_url && (
                      <a
                        href={o.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-red-600 underline"
                      >
                        View receipt
                      </a>
                    )}
                  </div>
                  <p className="text-base font-extrabold text-red-600 tabular-nums">
                    {formatRM(Number(o.total))}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                  <label className="text-[11px] font-semibold text-zinc-500">
                    Status
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                      className="ml-2 border-b border-zinc-300 bg-transparent px-1 py-1 text-xs font-bold text-zinc-800"
                    >
                      {STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="font-mono text-[10px] text-zinc-400" title={o.id}>
                    {o.id.slice(0, 8)}…
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
          </AnimatePresence>
          {orders.length === 0 && (
            <p className="text-xs leading-relaxed text-zinc-500 sm:col-span-2">No orders yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
