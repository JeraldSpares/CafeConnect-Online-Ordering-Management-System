"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { peso } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { posCreateOrder } from "./actions";

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

function iconFor(name: string): string {
  const n = name.toLowerCase();
  if (/espresso|americano|cappuccino|latte|coffee|brew|mocha/.test(n)) return "fa-mug-hot";
  if (/iced|cold|frappe|frappuccino|smoothie/.test(n)) return "fa-glass-water";
  if (/tea/.test(n)) return "fa-leaf";
  if (/croissant|pastry|muffin|cake|bread|donut|sandwich/.test(n)) return "fa-cookie-bite";
  if (/juice/.test(n)) return "fa-glass-citrus";
  return "fa-mug-saucer";
}

export function PosClient({
  categories,
  items,
}: {
  categories: Category[];
  items: Item[];
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

  const [collect, setCollect] = useState(true);
  const [method, setMethod] = useState<"cash" | "gcash" | "maya" | "card">("cash");
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
  const tenderedNum = Number(tendered);
  const change =
    method === "cash" && tendered ? Math.max(0, tenderedNum - subtotal) : 0;

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
      qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
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
  }

  function submit() {
    if (lines.length === 0) {
      toast.error("Add items first.");
      return;
    }
    if (collect && method === "cash" && tenderedNum < subtotal) {
      toast.error("Cash tendered is less than total.");
      return;
    }
    startTransition(async () => {
      const res = await posCreateOrder({
        customer_name: customer,
        customer_phone: phone,
        order_type: orderType,
        notes,
        items: lines.map((l) => ({ menu_item_id: l.id, quantity: l.qty })),
        payment: collect
          ? {
              method,
              amount: subtotal,
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
              {filtered.map((it) => (
                <button
                  key={it.id}
                  onClick={() => addItem(it)}
                  className="cc-card cc-card-hover group flex flex-col items-center p-4 text-center transition-transform active:scale-95"
                >
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
              ))}
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
                {lines.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-primary)]">
                        {l.name}
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
                ))}
              </ul>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Special instructions (optional)"
              className="cc-input mt-4 text-sm"
            />

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
            <div className="flex items-end justify-between">
              <span className="text-sm text-[var(--color-muted)]">Total</span>
              <span className="font-display text-3xl font-bold text-[var(--color-primary)]">
                {peso.format(subtotal)}
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
