import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { NewInventoryItemForm } from "./new-item-form";
import { MovementForm } from "./movement-form";

export const dynamic = "force-dynamic";

function fmtQty(n: number, unit: string) {
  const formatted = new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 3,
  }).format(n);
  return `${formatted} ${unit}`;
}

export default async function InventoryPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: recent }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select(
        "id, name, unit, stock_quantity, reorder_level, cost_per_unit, updated_at",
      )
      .order("name"),
    supabase
      .from("inventory_movements")
      .select(
        "id, change_amount, reason, notes, created_at, inventory_items ( name, unit )",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const lowStock =
    items?.filter(
      (i) => Number(i.stock_quantity) <= Number(i.reorder_level),
    ) ?? [];

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-boxes-stacked" /> Stock Room
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Inventory
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Track stock levels in real time. Each movement updates the current
          quantity automatically.
        </p>
      </header>

      {lowStock.length > 0 && (
        <div className="cc-card flex items-start gap-3 border-l-4 border-l-[var(--color-danger)] p-4 text-sm text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation mt-0.5 text-lg" />
          <div>
            <strong>{lowStock.length}</strong> item
            {lowStock.length === 1 ? "" : "s"} at or below reorder level:{" "}
            {lowStock.map((i) => i.name).join(", ")}.
          </div>
        </div>
      )}

      <NewInventoryItemForm />

      <section className="cc-card overflow-hidden">
        <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
          <i className="fa-solid fa-warehouse text-[var(--color-primary)]" />
          <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
            Stock on hand
          </h2>
        </header>
        {items && items.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">On hand</th>
                <th className="px-6 py-3">Reorder ≤</th>
                <th className="px-6 py-3">Cost</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3">Record movement</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const low =
                  Number(it.stock_quantity) <= Number(it.reorder_level);
                return (
                  <tr
                    key={it.id}
                    className="border-t border-[var(--color-line)] transition-colors hover:bg-[var(--color-primary-50)]/40"
                  >
                    <td className="px-6 py-3 font-medium">
                      <Link
                        href={`/admin/inventory/${it.id}`}
                        className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary-50)]">
                          <i className="fa-solid fa-box text-xs" />
                        </span>
                        {it.name}
                      </Link>
                    </td>
                    <td
                      className={`px-6 py-3 font-semibold ${low ? "text-[var(--color-danger)]" : ""}`}
                    >
                      {low && (
                        <i className="fa-solid fa-arrow-down mr-1 animate-bounce" />
                      )}
                      {fmtQty(Number(it.stock_quantity), it.unit)}
                    </td>
                    <td className="px-6 py-3 text-[var(--color-muted)]">
                      {fmtQty(Number(it.reorder_level), it.unit)}
                    </td>
                    <td className="px-6 py-3">
                      {peso.format(Number(it.cost_per_unit))}
                    </td>
                    <td className="px-6 py-3 text-[var(--color-muted)]">
                      {formatDateTime(it.updated_at)}
                    </td>
                    <td className="px-6 py-3">
                      <MovementForm itemId={it.id} unit={it.unit} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center">
            <i className="fa-solid fa-box-open text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No inventory items yet. Add one above.
            </p>
          </div>
        )}
      </section>

      <section className="cc-card overflow-hidden">
        <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
          <i className="fa-solid fa-clock-rotate-left text-[var(--color-primary)]" />
          <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
            Recent movements
          </h2>
        </header>
        {recent && recent.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">When</th>
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Change</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => {
                const item = Array.isArray(m.inventory_items)
                  ? m.inventory_items[0]
                  : m.inventory_items;
                const positive = Number(m.change_amount) > 0;
                return (
                  <tr
                    key={m.id}
                    className="border-t border-[var(--color-line)] transition-colors hover:bg-[var(--color-primary-50)]/40"
                  >
                    <td className="px-6 py-3 text-[var(--color-muted)]">
                      {formatDateTime(m.created_at)}
                    </td>
                    <td className="px-6 py-3">{item?.name ?? "—"}</td>
                    <td className="px-6 py-3 capitalize">
                      <span className="inline-flex items-center gap-1">
                        <i
                          className={`fa-solid ${
                            m.reason === "restock"
                              ? "fa-arrow-up text-[var(--color-success)]"
                              : m.reason === "wastage"
                                ? "fa-arrow-down text-[var(--color-danger)]"
                                : "fa-arrows-up-down text-[var(--color-accent)]"
                          }`}
                        />
                        {m.reason}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-3 font-semibold ${positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
                    >
                      {positive ? "+" : ""}
                      {fmtQty(Number(m.change_amount), item?.unit ?? "")}
                    </td>
                    <td className="px-6 py-3 text-[var(--color-muted)]">
                      {m.notes ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center">
            <i className="fa-solid fa-inbox text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No movements recorded yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
