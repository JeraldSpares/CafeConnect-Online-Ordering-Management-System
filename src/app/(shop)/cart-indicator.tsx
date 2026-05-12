"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartIndicator() {
  const { itemCount } = useCart();
  return (
    <Link
      href="/cart"
      className="relative ml-1 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-700)] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <i className="fa-solid fa-bag-shopping" />
      <span>Cart</span>
      {itemCount > 0 && (
        <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-accent)] px-1.5 text-xs font-bold text-[var(--color-primary-700)] animate-pulse-ring">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
