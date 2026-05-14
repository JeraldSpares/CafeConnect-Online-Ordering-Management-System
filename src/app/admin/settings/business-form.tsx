"use client";

import { useTransition } from "react";
import { useToast } from "@/lib/toast";
import { updateBusinessSettings } from "./actions";

type Defaults = {
  business_name: string;
  business_tin: string;
  business_address: string;
  vat_rate: number;
  revenue_goal_monthly: number;
  loyalty_threshold: number;
  demo_mode: boolean;
};

export function BusinessSettingsForm({
  defaults,
  id,
}: {
  defaults: Defaults;
  id?: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <form
      id={id}
      action={(fd) =>
        startTransition(async () => {
          const res = await updateBusinessSettings(fd);
          if (res.error) toast.error(res.error);
          else toast.success(res.notice ?? "Saved.");
        })
      }
      className="cc-card p-6"
    >
      <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <i className="fa-solid fa-store text-[var(--color-accent)]" />
        Business &amp; system settings
      </h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Used by the official receipt, the dashboard goal widget, the loyalty
        card, and the demo-mode banner.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Business name
          </label>
          <input
            name="business_name"
            defaultValue={defaults.business_name}
            className="cc-input mt-1 !py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            TIN
          </label>
          <input
            name="business_tin"
            defaultValue={defaults.business_tin}
            className="cc-input mt-1 !py-2 font-mono text-sm"
            placeholder="000-000-000-000"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            VAT rate (0–1)
          </label>
          <input
            name="vat_rate"
            type="number"
            step="0.01"
            min="0"
            max="1"
            defaultValue={defaults.vat_rate}
            className="cc-input mt-1 !py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Address
          </label>
          <input
            name="business_address"
            defaultValue={defaults.business_address}
            className="cc-input mt-1 !py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            <i className="fa-solid fa-bullseye mr-1" /> Monthly revenue goal (PHP)
          </label>
          <input
            name="revenue_goal_monthly"
            type="number"
            step="100"
            min="0"
            defaultValue={defaults.revenue_goal_monthly}
            className="cc-input mt-1 !py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            <i className="fa-solid fa-stamp mr-1" /> Loyalty threshold (paid orders)
          </label>
          <input
            name="loyalty_threshold"
            type="number"
            min="2"
            max="50"
            defaultValue={defaults.loyalty_threshold}
            className="cc-input mt-1 !py-2 text-sm"
          />
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--color-line)] p-3">
        <input
          type="checkbox"
          name="demo_mode"
          defaultChecked={defaults.demo_mode}
          className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
        />
        <span>
          <span className="block text-sm font-semibold text-[var(--color-primary)]">
            <i className="fa-solid fa-vial mr-1" /> Demo mode
          </span>
          <span className="block text-xs text-[var(--color-muted)]">
            Shows a banner on customer pages so demo guests know orders here
            are not real. Useful right before your capstone defense to make
            sure advisors don&apos;t think these are live transactions.
          </span>
        </span>
      </label>

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Saving…
            </>
          ) : (
            <>
              <i className="fa-solid fa-check" /> Save changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
