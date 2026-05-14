"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import {
  createDiscount,
  deleteDiscount,
  toggleDiscount,
} from "./actions";

export function DiscountTools() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      id="new-discount-form"
      action={(fd) =>
        startTransition(async () => {
          const res = await createDiscount(fd);
          if (res.error) toast.error(res.error);
          else {
            toast.success("Discount created.");
            (
              document.getElementById("new-discount-form") as HTMLFormElement
            )?.reset();
            router.refresh();
          }
        })
      }
      className="cc-card grid grid-cols-1 gap-3 p-6 md:grid-cols-6"
    >
      <div className="md:col-span-6">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-plus text-[var(--color-accent)]" /> New
          discount code
        </h2>
      </div>
      <div className="md:col-span-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Code
        </label>
        <input
          name="code"
          required
          placeholder="STUDENT10"
          className="cc-input mt-1 !py-2 font-mono text-sm uppercase"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Kind
        </label>
        <select
          name="kind"
          defaultValue="percent"
          className="cc-input mt-1 !py-2 text-sm"
        >
          <option value="percent">Percent (%)</option>
          <option value="fixed">Fixed (₱)</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Amount
        </label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          className="cc-input mt-1 !py-2 text-sm"
          placeholder="10"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Min order (₱)
        </label>
        <input
          name="min_order_total"
          type="number"
          step="1"
          min="0"
          defaultValue="0"
          className="cc-input mt-1 !py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Max uses (blank = ∞)
        </label>
        <input
          name="max_uses"
          type="number"
          min="1"
          className="cc-input mt-1 !py-2 text-sm"
        />
      </div>
      <div className="md:col-span-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Description (optional)
        </label>
        <input
          name="description"
          className="cc-input mt-1 !py-2 text-sm"
          placeholder="Student discount — valid until end of semester"
        />
      </div>
      <div className="md:col-span-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Expires at (optional)
        </label>
        <input
          name="expires_at"
          type="datetime-local"
          className="cc-input mt-1 !py-2 text-sm"
        />
      </div>
      <div className="md:col-span-6 flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Saving…
            </>
          ) : (
            <>
              <i className="fa-solid fa-ticket" /> Create code
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function DiscountRow({
  id,
  code,
  isActive,
}: {
  id: string;
  code: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="flex justify-end gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await toggleDiscount(id, !isActive);
            if (res.error) toast.error(res.error);
            else {
              toast.success(`${code} ${!isActive ? "activated" : "paused"}.`);
              router.refresh();
            }
          })
        }
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
      >
        <i className={`fa-solid ${isActive ? "fa-pause" : "fa-play"}`} />
        {isActive ? "Pause" : "Resume"}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete code ${code}?`)) return;
          startTransition(async () => {
            const res = await deleteDiscount(id);
            if (res.error) toast.error(res.error);
            else {
              toast.success(`${code} deleted.`);
              router.refresh();
            }
          });
        }}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-danger)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
      >
        <i className="fa-solid fa-trash" /> Delete
      </button>
    </div>
  );
}
