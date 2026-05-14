"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { addIngredient, removeIngredient } from "./actions";

type Inv = { id: string; name: string; unit: string; cost_per_unit: number };
type Existing = {
  id: string;
  inventory_item_id: string;
  inventory_name: string;
  inventory_unit: string;
  quantity: number;
};

export function RecipeEditor({
  menuItemId,
  existing,
  inventory,
}: {
  menuItemId: string;
  existing: Existing[];
  inventory: Inv[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [inventoryId, setInventoryId] = useState("");
  const [qty, setQty] = useState("");

  const usedIds = new Set(existing.map((e) => e.inventory_item_id));
  const available = inventory.filter((i) => !usedIds.has(i.id));

  return (
    <div className="space-y-4">
      {/* Add new row */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[var(--color-line)] p-3">
        <div className="min-w-48 flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Ingredient
          </label>
          <select
            value={inventoryId}
            onChange={(e) => setInventoryId(e.target.value)}
            className="cc-input mt-1 !py-2 text-sm"
          >
            <option value="">— Pick an inventory item —</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Qty / serving
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="cc-input mt-1 w-32 !py-2 text-sm"
            placeholder="0.5"
          />
        </div>
        <button
          disabled={pending || !inventoryId || !qty}
          onClick={() => {
            startTransition(async () => {
              const res = await addIngredient(
                menuItemId,
                inventoryId,
                Number(qty),
              );
              if (res.error) toast.error(res.error);
              else {
                toast.success("Ingredient added.");
                setInventoryId("");
                setQty("");
                router.refresh();
              }
            });
          }}
          className="btn-primary"
        >
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" />
              Adding…
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus" /> Add
            </>
          )}
        </button>
      </div>

      {/* Existing rows */}
      {existing.length === 0 ? (
        <p className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg)]/40 px-4 py-3 text-sm text-[var(--color-muted)]">
          <i className="fa-solid fa-circle-info mr-1" />
          No ingredients linked yet. Without a recipe, completing this item
          won&apos;t deduct anything from inventory.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
            <tr>
              <th className="px-4 py-2">Ingredient</th>
              <th className="px-4 py-2">Qty per serving</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {existing.map((r) => (
              <tr
                key={r.id}
                className="border-t border-[var(--color-line)]"
              >
                <td className="px-4 py-2 font-medium text-[var(--color-primary)]">
                  <i className="fa-solid fa-box mr-2 text-[var(--color-muted)]" />
                  {r.inventory_name}
                </td>
                <td className="px-4 py-2 text-[var(--color-muted)]">
                  {r.quantity} {r.inventory_unit}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Remove ${r.inventory_name} from this recipe?`))
                        return;
                      startTransition(async () => {
                        const res = await removeIngredient(r.id, menuItemId);
                        if (res.error) toast.error(res.error);
                        else {
                          toast.success("Removed.");
                          router.refresh();
                        }
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-danger)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                  >
                    <i className="fa-solid fa-trash" /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
