"use client";

import { useState, useTransition } from "react";
import { recordMovement } from "./actions";

export function MovementForm({
  itemId,
  unit,
}: {
  itemId: string;
  unit: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await recordMovement(itemId, formData);
          if (res?.error) setError(res.error);
          else
            (
              document.getElementById(`mv-${itemId}`) as HTMLFormElement
            )?.reset();
        });
      }}
      id={`mv-${itemId}`}
      className="flex flex-wrap items-center gap-2"
    >
      <select name="reason" defaultValue="restock" className="cc-input !py-1.5 text-xs">
        <option value="restock">↑ Restock</option>
        <option value="wastage">↓ Wastage</option>
        <option value="adjustment">± Adjustment</option>
      </select>
      <input
        name="amount"
        type="number"
        step="0.001"
        required
        placeholder={`Amount (${unit})`}
        className="cc-input w-28 !py-1.5 text-xs"
      />
      <input
        name="notes"
        placeholder="Note"
        className="cc-input w-32 !py-1.5 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-60"
      >
        {pending ? (
          <i className="fa-solid fa-spinner fa-spin" />
        ) : (
          <i className="fa-solid fa-check" />
        )}
        Record
      </button>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </form>
  );
}
