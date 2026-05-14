"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { peso, formatDateTime } from "@/lib/format";

type Order = {
  order_number: string;
  status: string;
  order_type: string;
  total: number;
  created_at: string;
  customer_name: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
  preparing: "bg-blue-50 text-blue-800",
  ready: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  completed: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

export default function MyOrdersPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loyalty, setLoyalty] = useState<{
    name: string;
    paid: number;
    next: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrders(null);
    setLoyalty(null);
    if (phone.replace(/[^0-9]/g, "").length < 7) {
      setError("Please enter your phone number.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const [ordersRes, loyaltyRes] = await Promise.all([
        supabase.rpc("customer_orders_by_phone", { p_phone: phone }),
        supabase.rpc("customer_loyalty_status", { p_phone: phone }),
      ]);
      if (ordersRes.error) {
        setError(ordersRes.error.message);
        return;
      }
      setOrders((ordersRes.data ?? []) as Order[]);
      const l = loyaltyRes.data?.[0];
      if (l) {
        setLoyalty({
          name: l.full_name ?? "",
          paid: Number(l.paid_orders ?? 0),
          next: Number(l.next_free_at ?? 10),
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-[var(--color-primary)]">
          <i className="fa-solid fa-clock-rotate-left mr-2" /> My orders
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Enter the phone number you used at checkout to see your order
          history.
        </p>
      </header>

      <form
        onSubmit={lookup}
        className="cc-card flex flex-wrap items-center gap-2 p-4"
      >
        <div className="relative min-w-48 flex-1">
          <i className="fa-solid fa-phone pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0917…"
            className="cc-input !pl-10"
            type="tel"
            inputMode="tel"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Searching…
            </>
          ) : (
            <>
              <i className="fa-solid fa-magnifying-glass" /> Find my orders
            </>
          )}
        </button>
      </form>

      {error && (
        <p className="cc-card border-l-4 border-l-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation mr-1" /> {error}
        </p>
      )}

      {loyalty && loyalty.paid >= 0 && (
        <LoyaltyCard
          name={loyalty.name}
          paid={loyalty.paid}
          threshold={loyalty.next || 10}
        />
      )}

      {orders && orders.length === 0 && (
        <div className="cc-card p-10 text-center">
          <i className="fa-solid fa-mug-saucer text-4xl text-[var(--color-primary-200)]" />
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            No orders found under that number. Make sure you used the same
            phone at checkout.
          </p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="space-y-3" data-stagger>
          {orders.map((o) => (
            <li key={o.order_number}>
              <Link
                href={`/order/${o.order_number}`}
                className="cc-card cc-card-hover group flex items-center gap-4 p-4"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
                  <i className="fa-solid fa-receipt" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold text-[var(--color-primary)]">
                    {o.order_number}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {formatDateTime(o.created_at)} ·{" "}
                    <i
                      className={`fa-solid ${o.order_type === "dine_in" ? "fa-chair" : "fa-bag-shopping"}`}
                    />{" "}
                    {o.order_type === "dine_in" ? "Dine-in" : "Takeaway"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-[var(--color-primary)]">
                    {peso.format(Number(o.total))}
                  </p>
                  <span
                    className={`chip text-[9px] ${STATUS_COLOR[o.status] ?? "bg-zinc-100"}`}
                  >
                    {o.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LoyaltyCard({
  name,
  paid,
  threshold,
}: {
  name: string;
  paid: number;
  threshold: number;
}) {
  const cycle = paid % threshold;
  const reached = cycle === 0 && paid > 0;
  const earned = Math.floor(paid / threshold);
  return (
    <div className="cc-card overflow-hidden bg-[var(--color-primary)] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
            <i className="fa-solid fa-stamp" /> Loyalty Card
          </p>
          <h2 className="font-display mt-1 text-xl font-bold">
            Hi {name || "there"}!
          </h2>
          <p className="text-sm text-white/80">
            {reached
              ? `🎉 You've earned a FREE drink! Mention it on your next order.`
              : `You're ${threshold - cycle} order${threshold - cycle === 1 ? "" : "s"} away from a free drink.`}
          </p>
          {earned > 0 && (
            <p className="mt-1 text-xs text-[var(--color-accent)]">
              <i className="fa-solid fa-medal" /> {earned} free drink
              {earned === 1 ? "" : "s"} earned so far
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: threshold }, (_, i) => {
            const stamped = i < cycle || reached;
            return (
              <span
                key={i}
                className={`grid h-9 w-9 place-items-center rounded-full border-2 ${
                  stamped
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-primary)]"
                    : "border-white/30 text-white/30"
                }`}
              >
                {stamped ? (
                  <i className="fa-solid fa-mug-saucer" />
                ) : (
                  <i className="fa-regular fa-circle text-[6px]" />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
