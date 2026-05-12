"use client";

import { useState, useTransition } from "react";
import {
  advanceOrderStatus,
  cancelOrder,
  recordPayment,
} from "../actions";

type Status = "pending" | "preparing" | "ready" | "completed" | "cancelled";

const NEXT_LABEL: Record<Status, { label: string; icon: string } | null> = {
  pending:   { label: "Start preparing", icon: "fa-mug-hot" },
  preparing: { label: "Mark ready",      icon: "fa-bell" },
  ready:     { label: "Mark completed",  icon: "fa-circle-check" },
  completed: null,
  cancelled: null,
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
  preparing: "bg-blue-50 text-blue-800",
  ready: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  completed: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

export function OrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: Status;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next = NEXT_LABEL[status];
  const canCancel = ["pending", "preparing", "ready"].includes(status);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`chip ${STATUS_STYLE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
        {next && (
          <button
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await advanceOrderStatus(orderId, status);
                if (res?.error) setError(res.error);
              });
            }}
            className="btn-primary !py-1.5 !px-4"
          >
            {pending ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className={`fa-solid ${next.icon}`} />
            )}
            {next.label}
          </button>
        )}
        {canCancel && (
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm("Cancel this order?")) return;
              setError(null);
              startTransition(async () => {
                const res = await cancelOrder(orderId);
                if (res?.error) setError(res.error);
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger)] px-3 py-1.5 text-sm font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-bg)]"
          >
            <i className="fa-solid fa-xmark" /> Cancel
          </button>
        )}
      </div>
      {error && (
        <p className="rounded-md bg-[var(--color-danger-bg)] px-2 py-1 text-xs text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation mr-1" /> {error}
        </p>
      )}
    </div>
  );
}

export function PaymentForm({
  orderId,
  suggestedAmount,
}: {
  orderId: string;
  suggestedAmount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await recordPayment(orderId, formData);
          if (res?.error) setError(res.error);
        });
      }}
      className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <i className="fa-solid fa-cash-register mr-1" /> Record payment
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select name="payment_method" defaultValue="cash" className="cc-input !py-1.5 text-sm">
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="card">Card</option>
        </select>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={suggestedAmount.toFixed(2)}
          className="cc-input !py-1.5 text-sm"
        />
      </div>
      <input
        name="reference_number"
        placeholder="Reference # (optional)"
        className="cc-input !py-1.5 text-sm"
      />
      {error && (
        <p className="rounded-md bg-[var(--color-danger-bg)] px-2 py-1 text-xs text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation mr-1" /> {error}
        </p>
      )}
      <button
        disabled={pending}
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-success)] px-3 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
      >
        {pending ? (
          <>
            <i className="fa-solid fa-spinner fa-spin" /> Recording…
          </>
        ) : (
          <>
            <i className="fa-solid fa-check" /> Mark as paid
          </>
        )}
      </button>
    </form>
  );
}
