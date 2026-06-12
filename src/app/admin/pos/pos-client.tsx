"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { peso } from "@/lib/format";
import { useToast } from "@/lib/toast";
import {
  applyDiscountAction,
  lookupCustomerByPhone,
  posCreateOrder,
} from "./actions";

type Category = { id: string; name: string; sort_order: number };
type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  is_available: boolean;
};
type Line = { id: string; name: string; price: number; qty: number };
type StockStatus = "ok" | "low" | "out";

function iconFor(name: string): string {
  const n = name.toLowerCase();
  if (/espresso|americano|cappuccino|latte|coffee|brew|mocha/.test(n))
    return "fa-mug-hot";
  if (/iced|cold|frappe|frappuccino|smoothie/.test(n)) return "fa-glass-water";
  if (/tea/.test(n)) return "fa-leaf";
  if (/croissant|pastry|muffin|cake|bread|donut|sandwich/.test(n))
    return "fa-cookie-bite";
  if (/juice/.test(n)) return "fa-glass-citrus";
  return "fa-mug-saucer";
}

export function PosClient({
  categories,
  items,
  stockMap,
}: {
  categories: Category[];
  items: Item[];
  stockMap: Record<string, StockStatus>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [lines, setLines] = useState<Line[]>([]);

  const [customer, setCustomer] = useState("Walk-in");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [notes, setNotes] = useState("");

  // Discount state
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    id: string | null;
    description: string | null;
  } | null>(null);
  const [discountChecking, setDiscountChecking] = useState(false);

  // Customer-by-phone lookup (loyalty + autofill)
  const [loyalty, setLoyalty] = useState<{
    fullName: string | null;
    paidOrders: number;
    nextFreeAt: number;
    suggestionApplied: boolean;
  } | null>(null);
  const phoneLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [collect, setCollect] = useState(true);
  const [method, setMethod] = useState<"cash" | "gcash" | "maya" | "card">(
    "cash",
  );
  const [tendered, setTendered] = useState<string>("");
  const [reference, setReference] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCat !== "all" && i.category_id !== activeCat) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, search, activeCat]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discountAmount = appliedDiscount?.amount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);
  const tenderedNum = Number(tendered);
  const change =
    method === "cash" && tendered ? Math.max(0, tenderedNum - total) : 0;

  // Debounced phone -> loyalty lookup. Fires on every keystroke but only
  // hits the server when the input settles for 400ms AND has 7+ digits.
  useEffect(() => {
    if (phoneLookupTimer.current) clearTimeout(phoneLookupTimer.current);
    phoneLookupTimer.current = setTimeout(async () => {
      const cleaned = phone.replace(/[^0-9]/g, "");
      if (cleaned.length < 7) {
        setLoyalty(null);
        return;
      }
      const res = await lookupCustomerByPhone(phone);
      if (!res.match) {
        setLoyalty(null);
        return;
      }
      setLoyalty((prev) => ({
        fullName: res.fullName ?? null,
        paidOrders: res.paidOrders ?? 0,
        nextFreeAt: res.nextFreeAt ?? 10,
        suggestionApplied: prev?.suggestionApplied ?? false,
      }));
    }, 400);
    return () => {
      if (phoneLookupTimer.current) clearTimeout(phoneLookupTimer.current);
    };
  }, [phone]);

  // Discount can become invalid if subtotal drops below min_order_total
  // after items are removed. Re-validate whenever subtotal changes.
  useEffect(() => {
    if (!appliedDiscount) return;
    if (subtotal === 0) {
      setAppliedDiscount(null);
      return;
    }
    // Recalculate against current subtotal — the server is the source of truth.
    let cancelled = false;
    (async () => {
      const res = await applyDiscountAction(appliedDiscount.code, subtotal);
      if (cancelled) return;
      if (!res.ok) {
        setAppliedDiscount(null);
        toast.info("Discount removed — order no longer qualifies.");
      } else if (res.amount !== appliedDiscount.amount) {
        setAppliedDiscount({
          code: res.code ?? appliedDiscount.code,
          amount: res.amount ?? 0,
          id: res.discountId ?? appliedDiscount.id,
          description: res.description ?? appliedDiscount.description,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally key on subtotal only — re-evaluating on every code edit
    // would thrash the network.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  function addItem(item: Item) {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.id === item.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        { id: item.id, name: item.name, price: Number(item.price), qty: 1 },
      ];
    });
  }
  function setQty(id: string, qty: number) {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
    );
  }
  function reset() {
    setLines([]);
    setCustomer("Walk-in");
    setPhone("");
    setNotes("");
    setTendered("");
    setReference("");
    setCollect(true);
    setMethod("cash");
    setOrderType("dine_in");
    setDiscountCode("");
    setAppliedDiscount(null);
    setLoyalty(null);
  }

  async function applyDiscount() {
    const code = discountCode.trim();
    if (!code) {
      toast.error("Enter a code first.");
      return;
    }
    setDiscountChecking(true);
    const res = await applyDiscountAction(code, subtotal);
    setDiscountChecking(false);
    if (!res.ok) {
      toast.error(res.error ?? "Invalid discount.");
      return;
    }
    setAppliedDiscount({
      code: res.code ?? code,
      amount: res.amount ?? 0,
      id: res.discountId ?? null,
      description: res.description ?? null,
    });
    toast.success(`Discount applied: -${peso.format(res.amount ?? 0)}`);
  }

  function clearDiscount() {
    setDiscountCode("");
    setAppliedDiscount(null);
  }

  function applyLoyaltyName() {
    if (loyalty?.fullName) {
      setCustomer(loyalty.fullName);
      setLoyalty({ ...loyalty, suggestionApplied: true });
    }
  }

  function submit() {
    if (lines.length === 0) {
      toast.error("Add items first.");
      return;
    }
    if (collect && method === "cash" && tenderedNum < total) {
      toast.error("Cash tendered is less than total.");
      return;
    }
    // Soft warn if any line item is flagged out-of-stock by the recipe rollup.
    const outOfStock = lines.find((l) => stockMap[l.id] === "out");
    if (outOfStock) {
      const ok = window.confirm(
        `"${outOfStock.name}" looks low/out of an ingredient. Place order anyway?`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      const res = await posCreateOrder({
        customer_name: customer,
        customer_phone: phone,
        order_type: orderType,
        notes,
        items: lines.map((l) => ({ menu_item_id: l.id, quantity: l.qty })),
        discount: appliedDiscount
          ? {
              code: appliedDiscount.code,
              amount: appliedDiscount.amount,
              id: appliedDiscount.id,
            }
          : undefined,
        payment: collect
          ? {
              method,
              amount: total,
              reference,
            }
          : undefined,
      });
      if (res.error && !res.orderId) {
        toast.error(res.error);
        return;
      }
      if (res.error) toast.error(res.error);
      toast.success(`Order ${res.orderNumber} created.`);
      reset();
      router.push(`/admin/orders/${res.orderId}`);
    });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-[calc(100vh-1px)] lg:grid-cols-5 lg:overflow-hidden">
      {/* Item grid (left) */}
      <section className="flex flex-col lg:col-span-3 lg:overflow-hidden">
        <header className="border-b border-[var(--color-line)] bg-white px-6 py-4">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            <i className="fa-solid fa-cash-register" /> Point of Sale
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold text-[var(--color-primary)]">
            New order
          </h1>
        </header>

        <div className="border-b border-[var(--color-line)] bg-white px-6 py-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu (e.g. latte)…"
              className="cc-input !pl-10"
            />
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            <CatChip
              label="All"
              icon="fa-grip"
              active={activeCat === "all"}
              onClick={() => setActiveCat("all")}
            />
            {categories.map((c) => (
              <CatChip
                key={c.id}
                label={c.name}
                icon={iconFor(c.name)}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="cc-card p-10 text-center">
              <i className="fa-solid fa-magnifying-glass-minus text-4xl text-[var(--color-primary-200)]" />
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                No items match.
              </p>
            </div>
          ) : (
            <div
              data-stagger
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            >
              {filtered.map((it) => {
                const stock = stockMap[it.id] ?? "ok";
                return (
                  <button
                    key={it.id}
                    onClick={() => addItem(it)}
                    className="cc-card cc-card-hover group relative flex flex-col items-center p-4 text-center transition-transform active:scale-95"
                  >
                    {stock !== "ok" && (
                      <span
                        title={stock === "out" ? "Out of stock" : "Low stock"}
                        className={`absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                          stock === "out"
                            ? "bg-[var(--color-danger)] animate-pulse"
                            : "bg-[var(--color-accent)]"
                        }`}
                      />
                    )}
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)] transition-transform group-hover:scale-110">
                      <i className={`fa-solid ${iconFor(it.name)} text-2xl`} />
                    </span>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--color-primary)]">
                      {it.name}
                    </p>
                    <p className="font-display mt-1 text-base font-bold text-[var(--color-accent)]">
                      {peso.format(Number(it.price))}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Cart (right) */}
      <aside className="flex border-t border-[var(--color-line)] bg-white lg:col-span-2 lg:border-l lg:border-t-0 lg:overflow-hidden">
        <div className="flex flex-1 flex-col">
          <header className="border-b border-[var(--color-line)] px-6 py-4">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <i className="fa-solid fa-bag-shopping" /> Current order
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              {lines.length} item{lines.length === 1 ? "" : "s"}
            </p>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Customer name"
                className="cc-input !py-2 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (opt.)"
                className="cc-input !py-2 text-sm"
              />
            </div>

            {/* Customer + loyalty preview */}
            {loyalty && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-primary-50)] px-3 py-2 text-xs">
                {loyalty.fullName && !loyalty.suggestionApplied && (
                  <button
                    onClick={applyLoyaltyName}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                  >
                    <i className="fa-solid fa-user-check" /> Use &quot;
                    {loyalty.fullName}&quot;
                  </button>
                )}
                {loyalty.fullName && loyalty.suggestionApplied && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)]">
                    <i className="fa-solid fa-circle-check" /> Returning customer
                  </span>
                )}
                <LoyaltyStamps
                  paid={loyalty.paidOrders}
                  goal={loyalty.nextFreeAt}
                />
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType("dine_in")}
                className={`rounded-md border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  orderType === "dine_in"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)]"
                    : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                }`}
              >
                <i className="fa-solid fa-chair mr-1" /> Dine-in
              </button>
              <button
                onClick={() => setOrderType("takeaway")}
                className={`rounded-md border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  orderType === "takeaway"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)]"
                    : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                }`}
              >
                <i className="fa-solid fa-bag-shopping mr-1" /> Takeaway
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
                <i className="fa-solid fa-arrow-left mr-1" /> Pick items from the
                menu.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {lines.map((l) => {
                  const stock = stockMap[l.id] ?? "ok";
                  return (
                    <li
                      key={l.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-primary)]">
                          {l.name}
                          {stock === "out" && (
                            <span className="ml-1 text-[10px] font-bold uppercase text-[var(--color-danger)]">
                              · low/out
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">
                          {peso.format(l.price)} each
                        </p>
                      </div>
                      <div className="inline-flex items-center overflow-hidden rounded-full border border-[var(--color-line)]">
                        <button
                          onClick={() => setQty(l.id, l.qty - 1)}
                          className="h-7 w-7 text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                        >
                          <i className="fa-solid fa-minus text-xs" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => setQty(l.id, l.qty + 1)}
                          className="h-7 w-7 text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                        >
                          <i className="fa-solid fa-plus text-xs" />
                        </button>
                      </div>
                      <span className="w-16 text-right text-sm font-bold text-[var(--color-primary)]">
                        {peso.format(l.price * l.qty)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Special instructions (optional)"
              className="cc-input mt-4 text-sm"
            />

            {/* Discount code */}
            <div className="mt-4 rounded-xl border border-[var(--color-line)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <i className="fa-solid fa-tags mr-1" /> Discount code
              </p>
              {appliedDiscount ? (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-success)]">
                      <i className="fa-solid fa-circle-check mr-1" />
                      {appliedDiscount.code}
                    </p>
                    {appliedDiscount.description && (
                      <p className="truncate text-xs text-[var(--color-muted)]">
                        {appliedDiscount.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-success)]">
                      -{peso.format(appliedDiscount.amount)}
                    </span>
                    <button
                      onClick={clearDiscount}
                      className="grid h-6 w-6 place-items-center rounded-full text-[var(--color-muted)] hover:bg-white hover:text-[var(--color-danger)]"
                      aria-label="Remove discount"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter code"
                    className="cc-input !py-2 flex-1 text-sm uppercase tracking-wider"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyDiscount();
                      }
                    }}
                  />
                  <button
                    onClick={applyDiscount}
                    disabled={discountChecking || subtotal === 0}
                    className="rounded-md border-2 border-[var(--color-primary)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
                  >
                    {discountChecking ? (
                      <i className="fa-solid fa-spinner fa-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--color-line)] p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
                <input
                  type="checkbox"
                  checked={collect}
                  onChange={(e) => setCollect(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <i className="fa-solid fa-credit-card" /> Collect payment now
              </label>
              {collect && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {(["cash", "gcash", "maya", "card"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`rounded-md border-2 py-2 text-xs font-semibold capitalize transition-colors ${
                          method === m
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {method === "cash" ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tendered}
                      onChange={(e) => setTendered(e.target.value)}
                      placeholder="Cash tendered"
                      className="cc-input !py-2 text-sm"
                    />
                  ) : (
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Reference # (optional)"
                      className="cc-input !py-2 text-sm"
                    />
                  )}
                  {method === "cash" && tendered && (
                    <p className="text-xs text-[var(--color-muted)]">
                      Change:{" "}
                      <span className="font-bold text-[var(--color-success)]">
                        {peso.format(change)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <footer className="border-t border-[var(--color-line)] bg-[var(--color-primary-50)] px-6 py-4">
            {discountAmount > 0 && (
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted)]">
                  Subtotal · Discount
                </span>
                <span className="text-[var(--color-muted)]">
                  {peso.format(subtotal)} ·{" "}
                  <span className="font-semibold text-[var(--color-success)]">
                    -{peso.format(discountAmount)}
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-end justify-between">
              <span className="text-sm text-[var(--color-muted)]">Total</span>
              <span className="font-display text-3xl font-bold text-[var(--color-primary)]">
                {peso.format(total)}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={reset}
                disabled={pending || lines.length === 0}
                className="flex-1 rounded-full border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)] disabled:opacity-50"
              >
                <i className="fa-solid fa-rotate-left" /> Clear
              </button>
              <button
                onClick={submit}
                disabled={pending || lines.length === 0}
                className="btn-primary flex-[2]"
              >
                {pending ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check" /> Place order
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      </aside>
    </div>
  );
}

function CatChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow"
          : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
      }`}
    >
      <i className={`fa-solid ${icon}`} />
      {label}
    </button>
  );
}

function LoyaltyStamps({ paid, goal }: { paid: number; goal: number }) {
  const safeGoal = Math.max(1, goal);
  const inCycle = paid % safeGoal;
  const stamps = Array.from({ length: safeGoal }, (_, i) => i < inCycle);
  const filled = inCycle;
  const earnedFree = paid > 0 && paid % safeGoal === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-0.5">
        {stamps.map((on, i) => (
          <span
            key={i}
            className={`grid h-4 w-4 place-items-center rounded-full border ${
              on
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-line)] bg-white text-[var(--color-line)]"
            }`}
          >
            <i className="fa-solid fa-mug-hot text-[7px]" />
          </span>
        ))}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
        {earnedFree
          ? "🎁 free coffee earned"
          : `${filled} / ${safeGoal} stamps`}
      </span>
    </div>
  );
}
