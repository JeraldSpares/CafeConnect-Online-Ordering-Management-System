"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");

  return (
    <div className="mx-auto max-w-md cc-card p-8 animate-fade-up">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
          <i className="fa-solid fa-magnifying-glass text-2xl" />
        </div>
        <h1 className="font-display mt-4 text-3xl font-bold text-[var(--color-primary)]">
          Track your order
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Enter the order number from your receipt.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (orderNumber.trim()) {
            router.push(`/order/${encodeURIComponent(orderNumber.trim())}`);
          }
        }}
        className="mt-6 space-y-3"
      >
        <div className="relative">
          <i className="fa-solid fa-hashtag pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            placeholder="ORD-20260512-0001"
            className="cc-input !pl-10 font-mono tracking-wider"
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          <i className="fa-solid fa-magnifying-glass" /> Find my order
        </button>
      </form>
    </div>
  );
}
