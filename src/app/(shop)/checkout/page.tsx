"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useToast } from "@/lib/toast";
import { peso } from "@/lib/format";
import { placeOrderAction, previewDiscount } from "./actions";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("takeaway");
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountMsg, setDiscountMsg] = useState<string | null>(null);

  async function checkDiscount() {
    const code = discountCode.trim();
    if (!code) return;
    setDiscountChecking(true);
    setDiscountMsg(null);
    try {
      const res = await previewDiscount(code, subtotal);
      if (res.error) {
        setDiscountMsg(res.error);
        setDiscountValue(0);
        return;
      }
      if (!res.discount || res.discount <= 0) {
        setDiscountMsg("Code is invalid, expired, or your order is below the minimum.");
        setDiscountValue(0);
        return;
      }
      setDiscountValue(res.discount);
      setDiscountMsg(`Saved ${peso.format(res.discount)} 🎉`);
    } finally {
      setDiscountChecking(false);
    }
  }

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
        discount_code: discountValue > 0 ? discountCode.trim() : undefined,
      });
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      clear();
      toast.success(`Order ${res.orderNumber} placed! See you soon.`);
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

        {/* Discount code */}
        <section className="cc-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <i className="fa-solid fa-ticket" /> Discount code (optional)
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={discountCode}
              onChange={(e) => {
                setDiscountCode(e.target.value.toUpperCase());
                setDiscountValue(0);
                setDiscountMsg(null);
              }}
              placeholder="STUDENT10"
              className="cc-input flex-1 font-mono uppercase"
            />
            <button
              type="button"
              onClick={checkDiscount}
              disabled={discountChecking || !discountCode.trim()}
              className="btn-ghost"
            >
              {discountChecking ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> Checking…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" /> Apply
                </>
              )}
            </button>
          </div>
          {discountMsg && (
            <p
              className={`mt-2 text-xs ${
                discountValue > 0
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-danger)]"
              }`}
            >
              {discountMsg}
            </p>
          )}
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
              {peso.format(Math.max(0, subtotal - discountValue))}
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted)]">Subtotal</span>
            <span>{peso.format(subtotal)}</span>
          </div>
          {discountValue > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-[var(--color-success)]">
                <i className="fa-solid fa-ticket mr-1" /> {discountCode}
              </span>
              <span className="text-[var(--color-success)]">
                − {peso.format(discountValue)}
              </span>
            </div>
          )}
          <div className="mt-3 flex items-end justify-between border-t border-[var(--color-line)] pt-3">
            <span className="text-sm text-[var(--color-muted)]">Total</span>
            <span className="font-display text-2xl font-bold text-[var(--color-primary)]">
              {peso.format(Math.max(0, subtotal - discountValue))}
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
