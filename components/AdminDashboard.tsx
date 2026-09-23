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
  items: { flavour: string; quantity: number; cooked: boolean }[];
  subtotal: number;
  cooked_fee: number;
  total: number;
  status: string;
  payment_method: string;
  receipt_url: string;
  pay_to: string;
}

const STATUS = ["new", "accepted", "preparing", "delivered", "cancelled"];

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
              Open time (HH:MM)
              <input
                value={settings.open_time.slice(0, 5)}
                onChange={(e) => setSettings({ ...settings, open_time: `${e.target.value}:00` })}
                placeholder="17:00"
                className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-sm font-normal outline-none focus:border-red-600"
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-700">
              Close time (HH:MM)
              <input
                value={settings.close_time.slice(0, 5)}
                onChange={(e) => setSettings({ ...settings, close_time: `${e.target.value}:00` })}
                placeholder="23:30"
                className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-sm font-normal outline-none focus:border-red-600"
              />
            </label>
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
        <div className="mt-3 space-y-3">
          <AnimatePresence initial={false}>
          {orders.map((o) => (
            <motion.div
              key={o.id}
              layout={reduceMotion ? undefined : "position"}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={spring}
              className="border-t border-zinc-200 py-3 text-sm first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-zinc-900">
                  {o.customer_name} · {o.customer_phone}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(o.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {o.gender} · {o.kamsis} · {o.delivery_location_type} · {o.delivery_details}
              </p>
              <ul className="mt-1 text-xs text-zinc-700">
                {(o.items || []).map((i, idx) => (
                  <li key={idx}>
                    - {(FLAVOUR_LABELS as Record<string, string>)[i.flavour] || i.flavour} x
                    {i.quantity}
                    {i.cooked ? " (cooked)" : ""}
                  </li>
                ))}
              </ul>
              {o.notes && <p className="mt-1 text-xs text-zinc-500">Notes: {o.notes}</p>}
              <p className="mt-1 text-xs text-zinc-600">
                Payment:{" "}
                {o.payment_method === "cod"
                  ? "Cash on delivery"
                  : `Online · ${paymentQrLabel(o.pay_to || "")}`}
                {o.receipt_url && (
                  <>
                    {" · "}
                    <a
                      href={o.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-red-600 underline"
                    >
                      View receipt
                    </a>
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-red-600">{formatRM(Number(o.total))}</span>
                <select
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                    className="border-b border-zinc-300 bg-transparent px-1 py-1 text-xs"
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 font-mono text-[10px] text-zinc-400">{o.id}</p>
            </motion.div>
          ))}
          </AnimatePresence>
          {orders.length === 0 && (
            <p className="text-xs leading-relaxed text-zinc-500">No orders yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
