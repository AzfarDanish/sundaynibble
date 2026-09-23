"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BASE_PRICE,
  BANK_QR_IMAGE,
  COOKED_FEE_PER_PACK,
  FLAVOURS,
  HERO_IMAGE,
  MAX_RECEIPT_BYTES,
  calcTotals,
  formatRM,
  type DeliveryLocationType,
  type FlavourId,
  type Gender,
  type Kamsis,
  type PaymentMethod,
} from "@/lib/constants";
import { getSupabaseAnonClient } from "@/lib/supabase";

export interface InitialSettings {
  is_available: boolean;
  open_time: string;
  close_time: string;
  status_message: string;
  is_open: boolean;
}

// Critically damped default spring: graceful, no overshoot (§4).
const SPRING = { type: "spring", bounce: 0, duration: 0.4 } as const;
const QUICK_SPRING = { type: "spring", bounce: 0, duration: 0.25 } as const;

function shortTime(t: string): string {
  return t.slice(0, 5);
}

export default function OrderForm({ initial }: { initial: InitialSettings }) {
  const reduceMotion = useReducedMotion() ?? false;
  const spring = reduceMotion ? { duration: 0 } : SPRING;
  const quickSpring = reduceMotion ? { duration: 0 } : QUICK_SPRING;

  const [settings, setSettings] = useState<InitialSettings>(initial);
  const [qty, setQty] = useState<Record<FlavourId, number>>({
    carbonara: 0,
    quattro_cheese: 0,
    cheese: 0,
  });
  const [cooked, setCooked] = useState<Record<FlavourId, boolean>>({
    carbonara: false,
    quattro_cheese: false,
    cheese: false,
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [kamsis, setKamsis] = useState<Kamsis | "">("");
  const [deliveryType, setDeliveryType] = useState<DeliveryLocationType | "">("");
  const [deliveryDetails, setDeliveryDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("online");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderId: string; total: number } | null>(null);
  // Shown on every visit while the shop is closed — no remembered dismissal.
  const [showClosed, setShowClosed] = useState(!initial.is_open);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/sundaynibble/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setSettings(data);
        if (data.is_open) setShowClosed(false);
      } catch {
        // keep initial settings on network error
      }
    }
    const id = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const aisyahGirl = kamsis === "Kamsis Aisyah" && gender === "girl";

  function handleGenderChange(value: Gender | "") {
    setGender(value);
    if (kamsis === "Kamsis Aisyah" && value === "girl" && deliveryType === "door_to_door") {
      setDeliveryType("");
    }
  }

  function handleKamsisChange(value: Kamsis | "") {
    setKamsis(value);
    if (value === "Kamsis Aisyah" && gender === "girl" && deliveryType === "door_to_door") {
      setDeliveryType("");
    }
  }

  const items = useMemo(
    () =>
      FLAVOURS.filter((f) => qty[f.id] > 0).map((f) => ({
        flavour: f.id,
        quantity: qty[f.id],
        cooked: cooked[f.id],
      })),
    [qty, cooked]
  );

  const totals = useMemo(() => calcTotals(items), [items]);

  // Inline field feedback — validate as they type, not only on submit (§16).
  const phoneDigits = phone.replace(/\D/g, "");
  const nameInvalid = name.length > 0 && name.trim().length < 2;
  const phoneInvalid =
    phone.length > 0 && (phoneDigits.length < 7 || phone.length > 30);
  const roomFirst = deliveryDetails.trim().charAt(0).toUpperCase();
  const roomInvalid =
    deliveryDetails.length > 0 &&
    ((kamsis === "Kamsis Farabi" && roomFirst !== "F") ||
      (kamsis === "Kamsis Khawarizmi" && roomFirst !== "K"));

  const roomHint =
    kamsis === "Kamsis Farabi"
      ? "Add room number starting with F... e.g. F101-2"
      : kamsis === "Kamsis Khawarizmi"
        ? "Add room number starting with K... e.g. K205-1"
        : kamsis === "Kamsis Aisyah" && deliveryType === "door_to_door"
          ? "Add block + room number for door-to-door delivery"
          : "Free delivery at all kamsis";

  function changeQty(id: FlavourId, delta: number) {
    setQty((prev) => {
      const next = Math.max(0, Math.min(20, prev[id] + delta));
      return { ...prev, [id]: next };
    });
  }

  async function handleReceiptFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Receipt must be an image (JPG/PNG).");
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setUploadError("Receipt must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const supabase = getSupabaseAnonClient();
      const { error: upError } = await supabase.storage
        .from("receipts")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (upError) {
        setUploadError("Upload failed. Please try again.");
        return;
      }
      const { data } = supabase.storage.from("receipts").getPublicUrl(path);
      setReceiptUrl(data.publicUrl);
      setReceiptName(file.name);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function removeReceipt() {
    setReceiptUrl("");
    setReceiptName("");
    setUploadError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    if (items.length === 0) {
      setError("Please choose at least 1 ramen.");
      return;
    }
    if (!gender) {
      setError("Please choose Boy or Girl.");
      return;
    }
    if (!kamsis) {
      setError("Please choose your kamsis.");
      return;
    }
    if (!deliveryType) {
      setError("Please choose a delivery location.");
      return;
    }
    if (payment === "online" && !receiptUrl) {
      setError("Please upload your payment receipt.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/sundaynibble/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          gender,
          kamsis,
          delivery_location_type: deliveryType,
          delivery_details: deliveryDetails,
          notes,
          items,
          payment_method: payment,
          receipt_url: payment === "online" ? receiptUrl : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit order.");
        return;
      }
      setSuccess({ orderId: data.orderId, total: data.total });
      if (!reduceMotion && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch {
          // haptics are best-effort
        }
      }
      setQty({ carbonara: 0, quattro_cheese: 0, cheese: 0 });
      setCooked({ carbonara: false, quattro_cheese: false, cheese: false });
      removeReceipt();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const open = settings.is_open;

  return (
    <div className="mx-auto w-full max-w-2xl overflow-x-clip pb-36 lg:max-w-5xl lg:pb-10">
      {/* Flat sticky status bar — blur + hairline, no shadow */}
      <div className="material-bar sticky top-0 z-30 px-5 py-2.5">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 lg:max-w-5xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">
            Sunday Nibble
          </p>
          <AnimatePresence initial={false} mode="wait">
            <motion.p
              key={open ? "open" : "closed"}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={quickSpring}
              className={`shrink-0 whitespace-nowrap text-xs font-bold ${open ? "text-green-700" : "text-red-600"}`}
            >
              {open
                ? `Open · ${shortTime(settings.open_time)}–${shortTime(settings.close_time)}`
                : `Closed · ${shortTime(settings.open_time)}–${shortTime(settings.close_time)}`}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Hero cover — heading left over white fade; crop keeps right side on mobile */}
      <section aria-label="Welcome" className="relative h-60 w-full overflow-hidden sm:h-80">
        <Image
          src={HERO_IMAGE}
          alt="Samyang Buldak ramen"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center] sm:object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"
        />
        <div className="absolute inset-y-0 left-0 flex w-full max-w-[75%] flex-col justify-center px-5 sm:max-w-md sm:px-8">
          <motion.h1
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={spring}
            className="display-tight text-3xl font-extrabold text-zinc-900 sm:text-5xl"
          >
            Your Buldak, Your Way.
          </motion.h1>
          <motion.p
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { ...SPRING, delay: 0.08 }}
            className="mt-2 text-sm font-medium leading-relaxed text-zinc-700 sm:text-base"
          >
            Samyang Buldak ramen, made your way. Choose your favourite flavour, or have it
            cooked and ready to enjoy.
          </motion.p>
        </div>
      </section>

      <header className="px-5 pt-4">
        <p className="text-sm font-bold leading-relaxed text-zinc-900">
          {formatRM(BASE_PRICE)} per pack · Cooked ready +{formatRM(COOKED_FEE_PER_PACK)}/pack ·
          Free delivery
        </p>
        {!open && settings.status_message && (
          <p className="mt-2 border-l-2 border-red-600 pl-3 text-sm font-semibold text-red-700">
            {settings.status_message}
          </p>
        )}
      </header>

      <form onSubmit={submit} className="mt-6 lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
        <div>
          {/* Flavours — flat rows, dividers instead of cards */}
          <section aria-label="Flavours" className="border-y border-zinc-200">
            <h2 className="px-5 pt-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Choose flavour
            </h2>
            <ul className="divide-y divide-zinc-200">
              {FLAVOURS.map((f) => (
                <motion.li
                  key={f.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={spring}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <div className="relative h-16 w-16 shrink-0">
                    <Image
                      src={f.image}
                      alt={f.label}
                      fill
                      className="object-contain"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug text-zinc-900">{f.label}</p>
                    <p className="text-xs text-zinc-500">{formatRM(BASE_PRICE)}</p>
                    <label className="pressable mt-1 flex cursor-pointer items-center gap-1.5 rounded text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={cooked[f.id]}
                        onChange={(e) =>
                          setCooked((prev) => ({ ...prev, [f.id]: e.target.checked }))
                        }
                        className="h-4 w-4 accent-red-600"
                      />
                      Cooked ready (+{formatRM(COOKED_FEE_PER_PACK)})
                    </label>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                      transition={quickSpring}
                      onClick={() => changeQty(f.id, -1)}
                      className="pressable h-9 w-9 rounded-full border border-zinc-300 text-lg font-bold text-zinc-700"
                      aria-label={`Less ${f.label}`}
                    >
                      −
                    </motion.button>
                    <span className="relative flex w-6 justify-center overflow-hidden text-center text-base font-bold tabular-nums">
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={qty[f.id]}
                          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                          transition={quickSpring}
                        >
                          {qty[f.id]}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                      transition={quickSpring}
                      onClick={() => changeQty(f.id, 1)}
                      className="pressable h-9 w-9 rounded-full border border-zinc-300 text-lg font-bold text-zinc-700"
                      aria-label={`More ${f.label}`}
                    >
                      +
                    </motion.button>
                  </div>
                </motion.li>
              ))}
            </ul>
          </section>

          {/* Delivery — flat stacked fields */}
          <section aria-label="Delivery details" className="mt-8 px-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Delivery details
            </h2>
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="sn-name" className="text-xs font-semibold text-zinc-700">
                  Name
                </label>
                <input
                  id="sn-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Your name"
                  aria-invalid={nameInvalid}
                  className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base outline-none focus:border-red-600"
                />
                {nameInvalid && (
                  <span className="mt-1 block text-xs text-red-600">
                    Please enter at least 2 characters.
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sn-phone" className="text-xs font-semibold text-zinc-700">
                    Phone
                  </label>
                  <input
                    id="sn-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={30}
                    inputMode="tel"
                    placeholder="0123456789"
                    aria-invalid={phoneInvalid}
                    className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base outline-none focus:border-red-600"
                  />
                  {phoneInvalid && (
                    <span className="mt-1 block text-xs text-red-600">
                      Needs at least 7 digits.
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-700">Boy / Girl</span>
                  <div className="mt-2 flex gap-4">
                    {(["boy", "girl"] as Gender[]).map((g) => (
                      <label key={g} className="pressable flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-sm">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={gender === g}
                          onChange={() => handleGenderChange(g)}
                          required
                          className="h-4 w-4 accent-red-600"
                        />
                        {g === "boy" ? "Boy" : "Girl"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="sn-kamsis" className="text-xs font-semibold text-zinc-700">
                  Kamsis
                </label>
                <select
                  id="sn-kamsis"
                  value={kamsis}
                  onChange={(e) => handleKamsisChange(e.target.value as Kamsis | "")}
                  required
                  className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base outline-none focus:border-red-600"
                >
                  <option value="">Choose…</option>
                  <option value="Kamsis Aisyah">Kamsis Aisyah</option>
                  <option value="Kamsis Farabi">Kamsis Farabi</option>
                  <option value="Kamsis Khawarizmi">Kamsis Khawarizmi</option>
                </select>
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-700">Delivery location</span>
                <div className="mt-2 space-y-2">
                  {(
                    [
                      ["cafeteria", "Cafeteria"],
                      ["lobby", "Lobby"],
                      ["door_to_door", "Door to door"],
                      ["other", "Other"],
                    ] as [DeliveryLocationType, string][]
                  ).map(([v, label]) => {
                    const disabled = v === "door_to_door" && aisyahGirl;
                    return (
                      <label
                        key={v}
                        className={`pressable flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                          disabled
                            ? "cursor-not-allowed text-zinc-400"
                            : "cursor-pointer text-zinc-900 active:bg-zinc-100"
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery"
                          value={v}
                          checked={deliveryType === v}
                          onChange={() => setDeliveryType(v)}
                          required
                          disabled={disabled}
                          className="h-4 w-4 accent-red-600 disabled:opacity-40"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                {aisyahGirl && (
                  <span className="mt-1 block text-xs text-red-600">
                    Sorry, no door-to-door delivery at Kamsis Aisyah — please choose Cafeteria,
                    Lobby, or Other.
                  </span>
                )}
              </div>
              <div>
                <label htmlFor="sn-room" className="text-xs font-semibold text-zinc-700">
                  Room / details
                </label>
                <input
                  id="sn-room"
                  value={deliveryDetails}
                  onChange={(e) => setDeliveryDetails(e.target.value)}
                  required
                  maxLength={300}
                  placeholder={
                    kamsis === "Kamsis Farabi"
                      ? "F101-2"
                      : kamsis === "Kamsis Khawarizmi"
                        ? "K205-1"
                        : "Block / room / meeting point"
                  }
                  aria-invalid={roomInvalid}
                  className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base outline-none focus:border-red-600"
                />
                <span className={`mt-1 block text-xs ${roomInvalid ? "text-red-600" : "text-zinc-500"}`}>
                  {roomInvalid
                    ? kamsis === "Kamsis Farabi"
                      ? "Room must start with F... e.g. F101-2"
                      : "Room must start with K... e.g. K205-1"
                    : roomHint}
                </span>
              </div>
              <div>
                <label htmlFor="sn-notes" className="text-xs font-semibold text-zinc-700">
                  Notes (optional)
                </label>
                <input
                  id="sn-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  placeholder="Less spicy, extra fork, etc."
                  className="mt-1 w-full border-b border-zinc-300 bg-transparent px-0 py-2 text-base outline-none focus:border-red-600"
                />
              </div>
            </div>
          </section>

          {/* Payment — QR + online/COD + receipt */}
          <section aria-label="Payment" className="mt-8 border-t border-zinc-200 px-5 pt-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Payment</h2>
            <div className="mt-3 space-y-2">
              <label className="pressable flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 active:bg-zinc-100">
                <input
                  type="radio"
                  name="payment"
                  value="online"
                  checked={payment === "online"}
                  onChange={() => setPayment("online")}
                  className="mt-1 h-4 w-4 accent-red-600"
                />
                <span className="text-sm">
                  <span className="font-bold">Pay online</span>
                  <span className="block text-xs text-zinc-500">
                    Scan QR, then upload your receipt below.
                  </span>
                </span>
              </label>
              <label className="pressable flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 active:bg-zinc-100">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={payment === "cod"}
                  onChange={() => setPayment("cod")}
                  className="mt-1 h-4 w-4 accent-red-600"
                />
                <span className="text-sm">
                  <span className="font-bold">Cash on delivery</span>
                  <span className="block text-xs text-zinc-500">Pay cash when we arrive.</span>
                </span>
              </label>
            </div>

            <AnimatePresence initial={false}>
              {payment === "online" && (
                <motion.div
                  key="qr"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  transition={spring}
                  className="mt-4"
                >
                  <div className="mx-auto w-full max-w-[240px] border border-zinc-200">
                    <Image
                      src={BANK_QR_IMAGE}
                      alt="Bank QR for online payment"
                      width={480}
                      height={480}
                      className="h-auto w-full"
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-zinc-500">
                    Scan to pay {formatRM(totals.total)}, then upload receipt.
                  </p>
                  <div className="mt-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleReceiptFile(e.target.files?.[0])}
                      className="hidden"
                      aria-label="Upload payment receipt"
                    />
                    {!receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="pressable w-full border border-dashed border-zinc-400 px-4 py-3 text-sm font-bold text-zinc-700 active:border-red-600 active:text-red-700 disabled:opacity-50"
                      >
                        {uploading ? "Uploading…" : "Upload receipt (JPG/PNG, max 5MB)"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 border border-zinc-200 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptUrl} alt="Receipt preview" className="h-14 w-14 object-cover" />
                        <p className="min-w-0 flex-1 truncate text-xs text-zinc-600">{receiptName}</p>
                        <button
                          type="button"
                          onClick={removeReceipt}
                          className="shrink-0 px-2 py-1 text-xs font-bold text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {uploadError && (
                      <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
                        {uploadError}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Summary — flat; sticky bottom bar on mobile, plain column on desktop */}
        <div className="mt-8 border-t border-zinc-200 px-5 pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pt-0">
          <div className="lg:sticky lg:top-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Order summary
            </h2>
            {items.length === 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">No ramen selected yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-100 text-sm leading-relaxed text-zinc-700">
                <AnimatePresence initial={false}>
                  {items.map((i) => (
                    <motion.li
                      key={`${i.flavour}-${i.cooked}`}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      transition={quickSpring}
                      className="flex justify-between gap-2 py-1"
                    >
                      <span className="min-w-0 break-words">
                        {FLAVOURS.find((f) => f.id === i.flavour)?.label} x{i.quantity}
                        {i.cooked ? " (cooked)" : ""}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatRM(i.quantity * BASE_PRICE + (i.cooked ? i.quantity * COOKED_FEE_PER_PACK : 0))}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
            <dl className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-sm leading-relaxed">
              <div className="flex justify-between text-zinc-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatRM(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>Cooked fee</dt>
                <dd className="tabular-nums">{formatRM(totals.cookedFee)}</dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>Delivery</dt>
                <dd>FREE</dd>
              </div>
              <div className="flex justify-between pt-1 text-lg font-extrabold text-zinc-900">
                <dt>Total</dt>
                <dd className="relative overflow-hidden text-red-600">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={totals.total}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                      transition={quickSpring}
                      className="inline-block tabular-nums"
                    >
                      {formatRM(totals.total)}
                    </motion.span>
                  </AnimatePresence>
                </dd>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <dt>Payment</dt>
                <dd>{payment === "cod" ? "Cash on delivery" : "Online"}</dd>
              </div>
            </dl>
            <AnimatePresence initial={false} mode="wait">
              {error && (
                <motion.p
                  key={`error-${error}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={quickSpring}
                  role="alert"
                  className="mt-3 border-l-2 border-red-600 pl-3 text-xs font-semibold leading-relaxed text-red-700"
                >
                  {error}
                </motion.p>
              )}
              {success && !error && (
                <motion.p
                  key={`success-${success.orderId}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={quickSpring}
                  role="status"
                  className="mt-3 border-l-2 border-green-600 pl-3 text-xs font-semibold leading-relaxed text-green-800"
                >
                  Order placed! Total {formatRM(success.total)}. Order ID: {success.orderId.slice(0, 8)}…
                </motion.p>
              )}
            </AnimatePresence>
            {/* Mobile: fixed bottom action bar. Desktop: normal button. */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
              <motion.button
                type="submit"
                onClick={submit}
                whileTap={reduceMotion || submitting || !open ? undefined : { scale: 0.98 }}
                transition={quickSpring}
                disabled={submitting || !open || uploading}
                className="pressable w-full bg-red-600 px-4 py-3.5 text-base font-bold text-white disabled:bg-zinc-300 lg:mt-4"
              >
                {submitting
                  ? "Placing order…"
                  : open
                    ? `Place order · ${formatRM(totals.total)}`
                    : "Currently closed"}
              </motion.button>
              <p className="mt-1.5 text-center text-[11px] leading-relaxed text-zinc-500 lg:mt-2 lg:text-xs">
                Selling {shortTime(settings.open_time)}–{shortTime(settings.close_time)} · Free
                delivery
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Closed-shop notice — pops up on every visit while unavailable */}
      <AnimatePresence>
        {showClosed && !open && (
          <motion.div
            key="closed-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={quickSpring}
            onClick={() => setShowClosed(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="closed-title"
              onClick={(e) => e.stopPropagation()}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              transition={spring}
              className="w-full max-w-sm border-t-2 border-red-600 bg-white p-6"
            >
              <h2 id="closed-title" className="text-lg font-extrabold text-zinc-900">
                We&apos;re closed right now
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Selling hours are {shortTime(settings.open_time)}–
                {shortTime(settings.close_time)} daily.
                {settings.status_message ? ` ${settings.status_message}` : ""}
              </p>
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={quickSpring}
                onClick={() => setShowClosed(false)}
                autoFocus
                className="pressable mt-5 w-full bg-red-600 px-4 py-3 text-sm font-bold text-white"
              >
                Browse anyway
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
