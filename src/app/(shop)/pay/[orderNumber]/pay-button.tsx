"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/lib/toast";

export function PayDemoButton({
  orderNumber,
  method,
  label,
  icon,
}: {
  orderNumber: string;
  method: "gcash" | "maya" | "card";
  label: string;
  icon: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function pay() {
    setPending(true);
    try {
      // Simulate PayMongo redirect with a 1.5s spinner — feels real, no real
      // money moves. To wire actual PayMongo: hit /api/pay → it creates a
      // Checkout Session and returns checkout_url → window.location = checkout_url.
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: orderNumber, method }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Payment failed.");
        return;
      }
      toast.success("Payment confirmed!");
      router.push(`/order/${orderNumber}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={pay}
      disabled={pending}
      className="flex w-full items-center justify-between rounded-xl border-2 border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-50)] disabled:opacity-60"
    >
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-white">
          <i className={`fa-solid ${icon}`} />
        </span>
        <span className="text-[var(--color-primary)]">{label}</span>
      </span>
      {pending ? (
        <i className="fa-solid fa-spinner fa-spin text-[var(--color-primary)]" />
      ) : (
        <i className="fa-solid fa-arrow-right text-[var(--color-muted)]" />
      )}
    </button>
  );
}
