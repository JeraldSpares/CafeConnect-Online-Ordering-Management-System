"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { peso } from "@/lib/format";
import { placeOrderAction } from "./actions";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("takeaway");
  const [notes, setNotes] = useState("");

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md cc-card p-10 text-center animate-fade-up">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
          <i className="fa-solid fa-cart-shopping text-3xl" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-bold text-[var(--color-primary)]">
          Nothing to check out
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Add items from the menu first.
        </p>
        <Link href="/menu" className="btn-primary mt-6">
          <i className="fa-solid fa-arrow-right" /> Go to menu
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await placeOrderAction({
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        order_type: orderType,
        notes,
        items: lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
        })),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      clear();
      router.push(`/order/${res.orderNumber}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-2 space-y-6 animate-fade-up"
      >
        <header>
          <h1 className="font-display text-3xl font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-lock mr-2" /> Checkout
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            We&apos;ll text or email you when your order is ready.
          </p>
        </header>

        {/* Contact section */}
        <section className="cc-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <i className="fa-solid fa-user" /> Contact
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)]">
                Name <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="cc-input mt-1"
                placeholder="Juan dela Cruz"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)]">
                  <i className="fa-solid fa-phone mr-1" /> Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="cc-input mt-1"
                  placeholder="0917…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)]">
                  <i className="fa-solid fa-envelope mr-1" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cc-input mt-1"
                  placeholder="optional"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Order type */}
        <section className="cc-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <i className="fa-solid fa-bag-shopping" /> Where will you enjoy this?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <OrderTypeCard
              icon="fa-bag-shopping"
              label="Takeaway"
              hint="Grab and go"
              active={orderType === "takeaway"}
              onClick={() => setOrderType("takeaway")}
            />
            <OrderTypeCard
              icon="fa-chair"
              label="Dine-in"
              hint="Stay a while"
              active={orderType === "dine_in"}
              onClick={() => setOrderType("dine_in")}
            />
          </div>
        </section>

        {/* Notes */}
        <section className="cc-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <i className="fa-solid fa-pen" /> Special instructions
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="cc-input"
            placeholder="Less sugar, no whipped cream, etc."
          />
        </section>

        <div className="cc-card flex items-start gap-3 border-l-4 border-l-[var(--color-accent)] p-4 text-sm text-[var(--color-muted)]">
          <i className="fa-solid fa-circle-info mt-0.5 text-[var(--color-accent)]" />
          <p>
            Payment is collected at the counter (cash, GCash, Maya, or card).
            You&apos;ll get an order number to show on pickup.
          </p>
        </div>

        {error && (
          <p className="cc-card border-l-4 border-l-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">
            <i className="fa-solid fa-triangle-exclamation mr-1" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full !py-3 text-base"
        >
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Placing order…
            </>
          ) : (
            <>
              <i className="fa-solid fa-check" /> Place order ·{" "}
              {peso.format(subtotal)}
            </>
          )}
        </button>
      </form>

      <aside className="animate-fade-up self-start lg:sticky lg:top-24">
        <div className="cc-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            Order Summary
          </h2>
          <ul className="mt-4 space-y-2">
            {lines.map((l) => (
              <li
                key={l.menu_item_id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                    <i className="fa-solid fa-mug-saucer text-xs" />
                  </span>
                  <span className="truncate">
                    <span className="text-[var(--color-muted)]">
                      {l.quantity}×
                    </span>{" "}
                    {l.name}
                  </span>
                </span>
                <span>{peso.format(l.unit_price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="my-4 h-px bg-[var(--color-line)]" />
          <div className="flex items-end justify-between">
            <span className="text-sm text-[var(--color-muted)]">Total</span>
            <span className="font-display text-2xl font-bold text-[var(--color-primary)]">
              {peso.format(subtotal)}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function OrderTypeCard({
  icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary-50)] shadow-md"
          : "border-[var(--color-line)] bg-white hover:border-[var(--color-primary-200)]"
      }`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
          active
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
        }`}
      >
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-[var(--color-primary)]">
          {label}
        </span>
        <span className="block text-xs text-[var(--color-muted)]">{hint}</span>
      </span>
      {active && (
        <i className="fa-solid fa-circle-check text-[var(--color-primary)]" />
      )}
    </button>
  );
}
