"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export default function AdminLogin() {
  const reduceMotion = useReducedMotion() ?? false;
  const spring = reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.4 } as const;
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/sundaynibble/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className="mx-auto mt-16 w-full max-w-sm border-t-2 border-red-600 bg-white px-1 pt-6"
    >
      <h1 className="text-lg font-bold leading-snug text-zinc-900">Sunday Nibble Admin</h1>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">Enter admin password to manage availability and orders.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base outline-none focus:border-red-600"
        />
        <AnimatePresence initial={false} mode="wait">
          {error && (
            <motion.p
              key={error}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={spring}
              role="alert"
              className="text-xs font-semibold leading-relaxed text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button
          type="submit"
          whileTap={reduceMotion || loading ? undefined : { scale: 0.97 }}
          disabled={loading}
          className="pressable w-full bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:bg-zinc-300"
        >
          {loading ? "Checking…" : "Login"}
        </motion.button>
      </form>
    </motion.div>
  );
}
