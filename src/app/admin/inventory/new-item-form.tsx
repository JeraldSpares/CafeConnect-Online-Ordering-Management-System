"use client";

import { useState, useTransition } from "react";
import { createInventoryItem } from "./actions";

export function NewInventoryItemForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      id="new-inv-form"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await createInventoryItem(formData);
          if (res?.error) setError(res.error);
          else
            (
              document.getElementById("new-inv-form") as HTMLFormElement
            )?.reset();
        });
      }}
      className="cc-card grid grid-cols-1 gap-3 p-6 md:grid-cols-6"
    >
      <div className="md:col-span-6">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-plus text-[var(--color-accent)]" /> Add inventory item
        </h2>
      </div>
      <div className="md:col-span-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Name
        </label>
        <input name="name" required className="cc-input mt-1 !py-2 text-sm" placeholder="Coffee Beans" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Unit
        </label>
        <input name="unit" required className="cc-input mt-1 !py-2 text-sm" placeholder="kg, ml, pcs" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Starting stock
        </label>
        <input
          name="stock_quantity"
          type="number"
          step="0.001"
          min="0"
          defaultValue="0"
          className="cc-input mt-1 !py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Reorder level
        </label>
        <input
          name="reorder_level"
          type="number"
          step="0.001"
          min="0"
          defaultValue="0"
          className="cc-input mt-1 !py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Cost / unit
        </label>
        <input
          name="cost_per_unit"
          type="number"
          step="0.01"
          min="0"
          defaultValue="0"
          className="cc-input mt-1 !py-2 text-sm"
        />
      </div>
      <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-3">
        {error && (
          <p className="flex-1 rounded-md border-l-4 border-l-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-1.5 text-xs text-[var(--color-danger)]">
            <i className="fa-solid fa-triangle-exclamation mr-1" /> {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Adding…
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus" /> Add item
            </>
          )}
        </button>
      </div>
    </form>
  );
}
