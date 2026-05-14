"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import {
  generateDemoOrders,
  generateInventoryHistory,
  purgeDemoData,
} from "./actions";

export function DevTools() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(30);
  const [invDays, setInvDays] = useState(14);

  function run(fn: () => Promise<{ error: string | null } & Record<string, unknown>>, label: string) {
    startTransition(async () => {
      toast.info(`${label}…`);
      const res = await fn();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const stats: string[] = [];
      if (res.ordersCreated) stats.push(`${res.ordersCreated} orders`);
      if (res.customersCreated) stats.push(`${res.customersCreated} customers`);
      if (res.paymentsCreated) stats.push(`${res.paymentsCreated} payments`);
      if (res.movements) stats.push(`${res.movements} movements`);
      toast.success(`${label} done. ${stats.join(" · ")}`);
      router.refresh();
    });
  }

  function confirmPurge() {
    if (
      !confirm(
        "This will DELETE every order, customer, transaction, inventory movement, and audit log entry. Are you sure?",
      )
    )
      return;
    if (!confirm("Are you really sure? This cannot be undone.")) return;
    startTransition(async () => {
      toast.info("Wiping demo data…");
      const res = await purgeDemoData();
      if (res.error) toast.error(res.error);
      else {
        toast.success("All demo data wiped clean.");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Orders generator */}
      <section className="cc-card p-6">
        <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
          <i className="fa-solid fa-receipt text-[var(--color-accent)]" />
          Generate orders
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Creates realistic orders distributed over the last N days — busier on
          weekends, biased toward morning/lunch/afternoon peaks. Mix of new and
          returning customers, 92% completed with payment, 5% cancelled.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Days
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 30)}
              className="cc-input mt-1 !py-2 text-sm"
            />
          </div>
          <button
            disabled={pending}
            onClick={() => run(() => generateDemoOrders(days), "Generating orders")}
            className="btn-primary"
          >
            {pending ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Working…
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt" /> Generate
              </>
            )}
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          <i className="fa-solid fa-circle-info mr-1" /> ~10–25 orders per day,
          so 30 days produces ~450 records. Takes ~30 seconds.
        </p>
      </section>

      {/* Inventory history generator */}
      <section className="cc-card p-6">
        <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
          <i className="fa-solid fa-boxes-stacked text-[var(--color-accent)]" />
          Generate inventory history
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Backfills restocks, wastage, and adjustments over the last N days so
          the movement history table and consumption ETAs have data to chew on.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Days
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={invDays}
              onChange={(e) => setInvDays(Number(e.target.value) || 14)}
              className="cc-input mt-1 !py-2 text-sm"
            />
          </div>
          <button
            disabled={pending}
            onClick={() =>
              run(
                () => generateInventoryHistory(invDays),
                "Generating inventory history",
              )
            }
            className="btn-primary"
          >
            {pending ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Working…
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt" /> Generate
              </>
            )}
          </button>
        </div>
      </section>

      {/* Purge */}
      <section className="cc-card border-l-4 border-l-[var(--color-danger)] p-6 lg:col-span-2">
        <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation" />
          Wipe all demo data
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Deletes <strong>every</strong> order, transaction, customer, inventory
          movement, and audit log row. Menu items, categories, and inventory
          items themselves are <strong>kept</strong> so you can re-generate.
          Useful right before the defense to start with a clean slate, then
          generate fresh data live.
        </p>
        <button
          disabled={pending}
          onClick={confirmPurge}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-danger)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
        >
          <i className="fa-solid fa-trash" /> Purge demo data
        </button>
      </section>
    </div>
  );
}
