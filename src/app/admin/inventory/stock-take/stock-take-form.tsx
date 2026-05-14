"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { submitStockTake } from "./actions";

type Item = { id: string; name: string; unit: string; expected: number };

export function StockTakeForm({ items }: { items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const previewRows = useMemo(() => {
    return items.map((i) => {
      const raw = actuals[i.id];
      const actual = raw === "" || raw === undefined ? null : Number(raw);
      const delta = actual === null || Number.isNaN(actual) ? null : actual - i.expected;
      return { ...i, actual, delta };
    });
  }, [items, actuals]);

  const variances = previewRows.filter(
    (r) => r.delta !== null && Math.abs(r.delta) > 0.0001,
  );

  function submit() {
    const rows = previewRows
      .filter((r) => r.actual !== null && Number.isFinite(r.actual))
      .map((r) => ({
        inventory_item_id: r.id,
        name: r.name,
        unit: r.unit,
        expected: r.expected,
        actual: r.actual as number,
      }));
    if (rows.length === 0) {
      toast.error("Enter at least one actual count first.");
      return;
    }
    startTransition(async () => {
      const res = await submitStockTake(rows, notes);
      if (res.error) toast.error(res.error);
      else {
        toast.success(res.notes ?? "Stock-take submitted.");
        setActuals({});
        setNotes("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="cc-card overflow-hidden">
        <header className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-list-check" /> Count sheet
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Leave blank to skip an item. Differences will be recorded as
            adjustments.
          </p>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
            <tr>
              <th className="px-6 py-3">Item</th>
              <th className="px-6 py-3">Expected</th>
              <th className="px-6 py-3">Actual count</th>
              <th className="px-6 py-3">Variance</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-line)]">
                <td className="px-6 py-2 font-medium text-[var(--color-primary)]">
                  <i className="fa-solid fa-box mr-2 text-[var(--color-muted)]" />
                  {r.name}
                </td>
                <td className="px-6 py-2 text-[var(--color-muted)]">
                  {r.expected} {r.unit}
                </td>
                <td className="px-6 py-2">
                  <input
                    type="number"
                    step="0.001"
                    value={actuals[r.id] ?? ""}
                    onChange={(e) =>
                      setActuals((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                    placeholder={`${r.expected}`}
                    className="cc-input w-32 !py-1.5 text-sm"
                  />
                </td>
                <td className="px-6 py-2 text-sm">
                  {r.delta === null ? (
                    <span className="text-[var(--color-muted)]">—</span>
                  ) : Math.abs(r.delta) < 0.0001 ? (
                    <span className="chip bg-[var(--color-success-bg)] text-[var(--color-success)]">
                      match
                    </span>
                  ) : (
                    <span
                      className={`font-semibold ${
                        r.delta > 0
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-danger)]"
                      }`}
                    >
                      {r.delta > 0 ? "+" : ""}
                      {r.delta.toFixed(3)} {r.unit}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cc-card p-6">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Optional notes
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="cc-input mt-1 !py-2 text-sm"
          placeholder="e.g. weekly stock-take, end-of-month, etc."
        />
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-[var(--color-muted)]">
            {variances.length > 0 ? (
              <>
                <i className="fa-solid fa-triangle-exclamation mr-1 text-[var(--color-accent)]" />
                <strong>{variances.length}</strong> item
                {variances.length === 1 ? "" : "s"} will be adjusted.
              </>
            ) : (
              <>No variances detected yet — counts match expected.</>
            )}
          </p>
          <button
            disabled={pending || variances.length === 0}
            onClick={submit}
            className="btn-primary"
          >
            {pending ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Submitting…
              </>
            ) : (
              <>
                <i className="fa-solid fa-check" /> Submit stock-take
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
