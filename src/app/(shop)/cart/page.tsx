"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { peso } from "@/lib/format";

export default function CartPage() {
  const { lines, subtotal, setQty, remove } = useCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md cc-card p-10 text-center animate-fade-up">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
          <i className="fa-solid fa-bag-shopping text-3xl" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-bold text-[var(--color-primary)]">
          Your bag is empty
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Browse the menu to add a cup or two — your future self will thank you.
        </p>
        <Link href="/menu" className="btn-primary mt-6">
          <i className="fa-solid fa-arrow-right" /> Browse menu
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4 animate-fade-up">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-bag-shopping mr-2" /> Your Bag
          </h1>
          <span className="text-sm text-[var(--color-muted)]">
            {lines.length} item{lines.length === 1 ? "" : "s"}
          </span>
        </header>

        <ul className="space-y-3" data-stagger>
          {lines.map((l) => (
            <li
              key={l.menu_item_id}
              className="cc-card flex items-center gap-4 p-4"
            >
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
                <i className="fa-solid fa-mug-saucer text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-semibold text-[var(--color-primary)] truncate">
                  {l.name}
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  {peso.format(l.unit_price)} each
                </p>
              </div>

              <div className="inline-flex items-center overflow-hidden rounded-full border border-[var(--color-line)] bg-white">
                <button
                  onClick={() => setQty(l.menu_item_id, l.quantity - 1)}
                  className="h-9 w-9 text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-50)]"
                  aria-label="Decrease"
                >
                  <i className="fa-solid fa-minus text-xs" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-[var(--color-primary)]">
                  {l.quantity}
                </span>
                <button
                  onClick={() => setQty(l.menu_item_id, l.quantity + 1)}
                  className="h-9 w-9 text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-50)]"
                  aria-label="Increase"
                >
                  <i className="fa-solid fa-plus text-xs" />
                </button>
              </div>

              <div className="w-24 text-right font-display text-base font-bold text-[var(--color-primary)]">
                {peso.format(l.unit_price * l.quantity)}
              </div>

              <button
                onClick={() => remove(l.menu_item_id)}
                className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                aria-label={`Remove ${l.name}`}
              >
                <i className="fa-solid fa-trash text-xs" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="animate-fade-up self-start lg:sticky lg:top-24">
        <div className="cc-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            Order Summary
          </h2>
          <dl className="mt-4 space-y-2 text-sm text-[var(--color-text)]">
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Subtotal</dt>
              <dd>{peso.format(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Service fee</dt>
              <dd>—</dd>
            </div>
            <div className="my-3 h-px bg-[var(--color-line)]" />
            <div className="flex items-end justify-between">
              <dt className="font-medium">Total</dt>
              <dd className="font-display text-2xl font-bold text-[var(--color-primary)]">
                {peso.format(subtotal)}
              </dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary mt-5 w-full">
            <i className="fa-solid fa-lock" /> Checkout
          </Link>
          <Link
            href="/menu"
            className="mt-3 block text-center text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            <i className="fa-solid fa-arrow-left mr-1" />
            Add more items
          </Link>
        </div>
      </aside>
    </div>
  );
}
