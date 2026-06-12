"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { peso } from "@/lib/format";
import { useToast } from "@/lib/toast";
import {
  applyDiscountAction,
  lookupCustomerByPhone,
  posCreateOrder,
  type PosPaymentSplit,
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
type Line = {
  id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
};
type StockStatus = "ok" | "low" | "out";

type HeldOrder = {
  id: string;
  label: string;
  savedAt: number;
  state: {
    lines: Line[];
    customer: string;
    phone: string;
    orderType: "dine_in" | "takeaway";
    notes: string;
    discountCode: string;
  };
};

const HELD_STORAGE_KEY = "sulyap.pos.held.v1";
const MAX_HELD = 10;

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

function loadHeld(): HeldOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HELD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHeld(list: HeldOrder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HELD_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage might be full or disabled — silent fail is acceptable for a non-critical feature
  }
}

type NumpadConfig = {
  title: string;
  value: string;
  mode: "amount" | "integer";
  onApply: (value: string) => void;
};

export function PosClient({
  categories,
  items,
  stockMap,
  tableCount,
}: {
  categories: Category[];
  items: Item[];
  stockMap: Record<string, StockStatus>;
  tableCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [lines, setLines] = useState<Line[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const [customer, setCustomer] = useState("Walk-in");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [tableLabel, setTableLabel] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [numpad, setNumpad] = useState<NumpadConfig | null>(null);

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    id: string | null;
    description: string | null;
  } | null>(null);
  const [discountChecking, setDiscountChecking] = useState(false);

  const [loyalty, setLoyalty] = useState<{
    fullName: string | null;
    paidOrders: number;
    nextFreeAt: number;
    suggestionApplied: boolean;
  } | null>(null);
  const phoneLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [collect, setCollect] = useState(true);
  const [splitMode, setSplitMode] = useState(false);
  // Single-payment mode mirrors the old UX so the muscle memory still works.
  const [method, setMethod] = useState<"cash" | "gcash" | "maya" | "card">(
    "cash",
  );
  const [tendered, setTendered] = useState<string>("");
  const [reference, setReference] = useState("");
  // Split mode: array of payment lines.
  const [splits, setSplits] = useState<PosPaymentSplit[]>([
    { method: "cash", amount: 0, reference: "" },
  ]);
  const [printAfter, setPrintAfter] = useState(false);

  const [held, setHeld] = useState<HeldOrder[]>([]);
  const [heldPanelOpen, setHeldPanelOpen] = useState(false);

  // Hydrate held orders from localStorage on mount only.
  useEffect(() => {
    setHeld(loadHeld());
  }, []);

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
  const splitsTotal = splits.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const splitBalance = total - splitsTotal;
  const change =
    method === "cash" && tendered ? Math.max(0, tenderedNum - total) : 0;

  // Debounced phone -> loyalty lookup.
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

  // Re-validate discount when subtotal changes.
  useEffect(() => {
    if (!appliedDiscount) return;
    if (subtotal === 0) {
      setAppliedDiscount(null);
      return;
    }
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
  function setLineNote(id: string, lineNotes: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notes: lineNotes } : l)),
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
    setTableLabel("");
    setDiscountCode("");
    setAppliedDiscount(null);
    setLoyalty(null);
    setSplitMode(false);
    setSplits([{ method: "cash", amount: 0, reference: "" }]);
    setExpandedNoteId(null);
    setNumpad(null);
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

  // -----------------------------------------------------------------------
  // Held orders — park current cart into localStorage so staff can take
  // a fast walk-in while a more complex order is being assembled.
  // -----------------------------------------------------------------------
  function holdCurrent() {
    if (lines.length === 0) {
      toast.error("Add items first before holding.");
      return;
    }
    const labelHead =
      customer && customer !== "Walk-in" ? customer : lines[0].name;
    const newHeld: HeldOrder = {
      id: crypto.randomUUID(),
      label: `${labelHead} · ${lines.length} item${lines.length === 1 ? "" : "s"}`,
      savedAt: Date.now(),
      state: {
        lines,
        customer,
        phone,
        orderType,
        notes,
        discountCode: appliedDiscount?.code ?? "",
      },
    };
    const next = [newHeld, ...held].slice(0, MAX_HELD);
    setHeld(next);
    saveHeld(next);
    reset();
    toast.success("Order held. Recall from the Held panel.");
  }

  function recallHeld(h: HeldOrder) {
    setLines(h.state.lines);
    setCustomer(h.state.customer);
    setPhone(h.state.phone);
    setOrderType(h.state.orderType);
    setNotes(h.state.notes);
    setDiscountCode(h.state.discountCode);
    setAppliedDiscount(null); // re-apply will re-validate
    const next = held.filter((x) => x.id !== h.id);
    setHeld(next);
    saveHeld(next);
    setHeldPanelOpen(false);
    toast.info(`Recalled "${h.label}"`);
  }

  function deleteHeld(id: string) {
    const next = held.filter((x) => x.id !== id);
    setHeld(next);
    saveHeld(next);
  }

  // -----------------------------------------------------------------------
  // Split payments
  // -----------------------------------------------------------------------
  function addSplit() {
    const remaining = Math.max(0, total - splitsTotal);
    setSplits((prev) => [
      ...prev,
      { method: "cash", amount: Number(remaining.toFixed(2)), reference: "" },
    ]);
  }
  function removeSplit(idx: number) {
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateSplit(idx: number, patch: Partial<PosPaymentSplit>) {
    setSplits((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );
  }

  function submit() {
    if (lines.length === 0) {
      toast.error("Add items first.");
      return;
    }
    if (collect) {
      if (!splitMode && method === "cash" && tenderedNum < total) {
        toast.error("Cash tendered is less than total.");
        return;
      }
      if (splitMode && Math.abs(splitBalance) > 0.01) {
        toast.error(
          splitBalance > 0
            ? `Still ₱${splitBalance.toFixed(2)} unpaid.`
            : `Over by ₱${Math.abs(splitBalance).toFixed(2)} — trim a split.`,
        );
        return;
      }
    }
    const outOfStock = lines.find((l) => stockMap[l.id] === "out");
    if (outOfStock) {
      const ok = window.confirm(
        `"${outOfStock.name}" looks low/out of an ingredient. Place order anyway?`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      const paymentsPayload: PosPaymentSplit[] | undefined = !collect
        ? undefined
        : splitMode
          ? splits.filter((s) => s.amount > 0)
          : [
              {
                method,
                amount: total,
                reference: method === "cash" ? "" : reference,
              },
            ];

      const res = await posCreateOrder({
        customer_name: customer,
        customer_phone: phone,
        order_type: orderType,
        table_label:
          orderType === "dine_in" && tableLabel ? tableLabel : undefined,
        notes,
        items: lines.map((l) => ({
          menu_item_id: l.id,
          quantity: l.qty,
          notes: l.notes?.trim() ? l.notes.trim() : undefined,
        })),
        discount: appliedDiscount ? { code: appliedDiscount.code } : undefined,
        payments: paymentsPayload,
      });
      if (res.error && !res.orderId) {
        toast.error(res.error);
        return;
      }
      if (res.error) toast.error(res.error);
      toast.success(`Order ${res.orderNumber} created.`);
      const orderId = res.orderId;
      reset();
      if (printAfter && orderId) {
        router.push(`/receipt/${orderId}`);
      } else if (orderId) {
        router.push(`/admin/orders/${orderId}`);
      }
    });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-[calc(100vh-1px)] lg:grid-cols-5 lg:overflow-hidden">
      {/* Item grid (left) */}
      <section className="flex flex-col lg:col-span-3 lg:overflow-hidden">
        <header className="flex items-start justify-between border-b border-[var(--color-line)] bg-white px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
              <i className="fa-solid fa-cash-register" /> Point of Sale
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold text-[var(--color-primary)]">
              New order
            </h1>
          </div>
          <button
            onClick={() => setHeldPanelOpen(true)}
            className="relative inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-pause" /> Held
            {held.length > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-white">
                {held.length}
              </span>
            )}
          </button>
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
                onClick={() => {
                  setOrderType("takeaway");
                  setTableLabel("");
                }}
                className={`rounded-md border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  orderType === "takeaway"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)]"
                    : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                }`}
              >
                <i className="fa-solid fa-bag-shopping mr-1" /> Takeaway
              </button>
            </div>

            {/* Table picker (dine-in only) */}
            {orderType === "dine_in" && tableCount > 0 && (
              <div className="mt-3 rounded-xl border border-[var(--color-line)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  <i className="fa-solid fa-chair mr-1" /> Table
                  {tableLabel && (
                    <span className="ml-2 font-bold text-[var(--color-primary)]">
                      · {tableLabel}
                    </span>
                  )}
                </p>
                <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                  {Array.from({ length: tableCount }, (_, i) => {
                    const label = String(i + 1);
                    const active = tableLabel === label;
                    return (
                      <button
                        key={label}
                        onClick={() => setTableLabel(active ? "" : label)}
                        className={`rounded-md border-2 py-1.5 text-[11px] font-bold transition-colors ${
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {lines.length === 0 ? (
              <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
                <i className="fa-solid fa-arrow-left mr-1" /> Pick items from the
                menu.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {lines.map((l) => {
                  const stock = stockMap[l.id] ?? "ok";
                  const noteOpen = expandedNoteId === l.id;
                  return (
                    <li
                      key={l.id}
                      className="rounded-lg border border-[var(--color-line)] bg-white p-2"
                    >
                      <div className="flex items-center gap-2">
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
                            {l.notes && (
                              <span className="ml-2 italic text-[var(--color-accent)]">
                                · {l.notes}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setExpandedNoteId(noteOpen ? null : l.id)
                          }
                          title={
                            l.notes
                              ? `Note: ${l.notes}`
                              : "Add a note (e.g. no sugar)"
                          }
                          className={`grid h-7 w-7 place-items-center rounded-full border ${
                            l.notes || noteOpen
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-50)] text-[var(--color-accent)]"
                              : "border-[var(--color-line)] bg-white text-[var(--color-muted)] hover:text-[var(--color-primary)]"
                          }`}
                        >
                          <i className="fa-solid fa-pen-to-square text-[10px]" />
                        </button>
                        <div className="inline-flex items-center overflow-hidden rounded-full border border-[var(--color-line)]">
                          <button
                            onClick={() => setQty(l.id, l.qty - 1)}
                            className="h-7 w-7 text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                          >
                            <i className="fa-solid fa-minus text-xs" />
                          </button>
                          <button
                            onClick={() =>
                              setNumpad({
                                title: `Quantity · ${l.name}`,
                                value: String(l.qty),
                                mode: "integer",
                                onApply: (v) => {
                                  const n = Math.max(0, Math.floor(Number(v) || 0));
                                  setQty(l.id, n);
                                },
                              })
                            }
                            title="Tap to set exact qty"
                            className="w-7 text-center text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                          >
                            {l.qty}
                          </button>
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
                      </div>
                      {noteOpen && (
                        <input
                          autoFocus
                          value={l.notes ?? ""}
                          onChange={(e) => setLineNote(l.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setExpandedNoteId(null);
                          }}
                          placeholder="e.g. no sugar, extra shot"
                          className="cc-input mt-2 !py-1.5 text-xs"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Special instructions (optional, applies to whole order)"
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

            {/* Payment */}
            <div className="mt-4 rounded-xl border border-[var(--color-line)] p-3">
              <div className="flex items-center justify-between">
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
                  <button
                    onClick={() => setSplitMode((v) => !v)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      splitMode
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-[var(--color-line)] bg-white text-[var(--color-muted)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    <i className="fa-solid fa-code-branch mr-1" /> Split
                  </button>
                )}
              </div>

              {collect && !splitMode && (
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
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tendered}
                        onChange={(e) => setTendered(e.target.value)}
                        placeholder="Cash tendered"
                        className="cc-input !py-2 flex-1 text-sm"
                      />
                      <button
                        onClick={() =>
                          setNumpad({
                            title: "Cash tendered",
                            value: tendered,
                            mode: "amount",
                            onApply: (v) => setTendered(v),
                          })
                        }
                        className="grid h-10 w-10 place-items-center rounded-md border border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                        aria-label="Open numpad"
                      >
                        <i className="fa-solid fa-calculator" />
                      </button>
                    </div>
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

              {collect && splitMode && (
                <div className="mt-3 space-y-2">
                  {splits.map((s, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 items-center gap-2"
                    >
                      <select
                        value={s.method}
                        onChange={(e) =>
                          updateSplit(i, {
                            method: e.target.value as PosPaymentSplit["method"],
                          })
                        }
                        className="cc-input col-span-4 !py-2 text-xs"
                      >
                        <option value="cash">Cash</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="card">Card</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={s.amount || ""}
                        onChange={(e) =>
                          updateSplit(i, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                        className="cc-input col-span-4 !py-2 text-xs"
                      />
                      <input
                        value={s.reference ?? ""}
                        onChange={(e) =>
                          updateSplit(i, { reference: e.target.value })
                        }
                        placeholder="Ref #"
                        className="cc-input col-span-3 !py-2 text-xs"
                      />
                      <button
                        onClick={() => removeSplit(i)}
                        disabled={splits.length <= 1}
                        className="col-span-1 grid h-7 w-7 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] disabled:opacity-30"
                        aria-label="Remove split"
                      >
                        <i className="fa-solid fa-xmark text-xs" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSplit}
                    className="w-full rounded-md border border-dashed border-[var(--color-line)] py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <i className="fa-solid fa-plus" /> Add split
                  </button>
                  <p className="text-xs">
                    Allocated:{" "}
                    <span className="font-bold text-[var(--color-primary)]">
                      {peso.format(splitsTotal)}
                    </span>
                    {" · "}
                    {Math.abs(splitBalance) < 0.01 ? (
                      <span className="font-bold text-[var(--color-success)]">
                        balanced
                      </span>
                    ) : splitBalance > 0 ? (
                      <span className="font-bold text-[var(--color-danger)]">
                        {peso.format(splitBalance)} short
                      </span>
                    ) : (
                      <span className="font-bold text-[var(--color-danger)]">
                        {peso.format(Math.abs(splitBalance))} over
                      </span>
                    )}
                  </p>
                </div>
              )}

              <label className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <input
                  type="checkbox"
                  checked={printAfter}
                  onChange={(e) => setPrintAfter(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                />
                <i className="fa-solid fa-print" /> Print receipt after submit
              </label>
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
                className="flex-1 rounded-full border border-[var(--color-line)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)] disabled:opacity-50"
              >
                <i className="fa-solid fa-rotate-left" /> Clear
              </button>
              <button
                onClick={holdCurrent}
                disabled={pending || lines.length === 0}
                className="flex-1 rounded-full border border-[var(--color-accent)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white disabled:opacity-50"
              >
                <i className="fa-solid fa-pause" /> Hold
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

      {/* Numeric keypad modal */}
      {numpad && (
        <Numpad
          config={numpad}
          onClose={() => setNumpad(null)}
        />
      )}

      {/* Held orders panel */}
      {heldPanelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setHeldPanelOpen(false)}
        >
          <div
            className="cc-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[var(--color-primary)]">
                <i className="fa-solid fa-pause mr-1" /> Held orders
              </h3>
              <button
                onClick={() => setHeldPanelOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)]"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>
            {held.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                Nothing parked. Press <strong>Hold</strong> on the cart to stash
                an order.
              </p>
            ) : (
              <ul className="space-y-2">
                {held.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white p-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-[var(--color-primary)]">
                        {h.label}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        Held {new Date(h.savedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => recallHeld(h)}
                      className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Recall
                    </button>
                    <button
                      onClick={() => deleteHeld(h.id)}
                      className="grid h-7 w-7 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                      aria-label="Delete held"
                    >
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
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

function Numpad({
  config,
  onClose,
}: {
  config: NumpadConfig;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(config.value || "");

  function push(d: string) {
    if (config.mode === "integer" && d === ".") return;
    setLocal((prev) => {
      if (d === "." && prev.includes(".")) return prev;
      if (prev === "0" && d !== ".") return d;
      return prev + d;
    });
  }
  function back() {
    setLocal((p) => p.slice(0, -1));
  }
  function clear() {
    setLocal("");
  }
  function add(n: number) {
    const cur = Number(local) || 0;
    setLocal(String(cur + n));
  }
  function apply() {
    config.onApply(local);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="cc-card w-full max-w-xs p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-[var(--color-primary)]">
            {config.title}
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)]"
            aria-label="Close numpad"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>
        <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-primary-50)] p-4 text-right">
          <p className="font-mono text-3xl font-bold text-[var(--color-primary)]">
            {config.mode === "amount" && "₱"}
            {local || "0"}
          </p>
        </div>
        {config.mode === "amount" && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[20, 50, 100, 500].map((n) => (
              <button
                key={n}
                onClick={() => add(n)}
                className="rounded-md border border-[var(--color-line)] bg-white py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
              >
                +{n}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => push(d)}
              className="rounded-md border border-[var(--color-line)] bg-white py-3 text-lg font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)] active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => push(".")}
            disabled={config.mode === "integer"}
            className="rounded-md border border-[var(--color-line)] bg-white py-3 text-lg font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)] disabled:opacity-30"
          >
            .
          </button>
          <button
            onClick={() => push("0")}
            className="rounded-md border border-[var(--color-line)] bg-white py-3 text-lg font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)] active:scale-95"
          >
            0
          </button>
          <button
            onClick={back}
            className="rounded-md border border-[var(--color-line)] bg-white py-3 text-lg font-bold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)] active:scale-95"
            aria-label="Backspace"
          >
            <i className="fa-solid fa-delete-left" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={clear}
            className="flex-1 rounded-md border border-[var(--color-line)] bg-white py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          >
            Clear
          </button>
          <button
            onClick={apply}
            className="btn-primary flex-[2]"
          >
            <i className="fa-solid fa-check" /> Apply
          </button>
        </div>
      </div>
    </div>
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
