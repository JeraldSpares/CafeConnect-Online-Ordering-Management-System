import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { MovementForm } from "../movement-form";

export const dynamic = "force-dynamic";

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: item }, { data: history }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select(
        "id, name, unit, stock_quantity, reorder_level, cost_per_unit, updated_at, created_at",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("inventory_movements")
      .select("id, change_amount, reason, notes, created_at")
      .eq("inventory_item_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!item) notFound();

  const fmt = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 3 });

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
      >
        <i className="fa-solid fa-arrow-left" /> Back to inventory
      </Link>

      <header className="cc-card p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-box" /> Item
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          {item.name}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Unit: {item.unit} · Cost {peso.format(Number(item.cost_per_unit))} /{" "}
          {item.unit}
        </p>
      </header>

      <section data-stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="cc-card p-5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
            <i className="fa-solid fa-warehouse" />
          </span>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            On hand
          </p>
          <p className="font-display mt-1 text-2xl font-bold text-[var(--color-primary)]">
            {fmt.format(Number(item.stock_quantity))} {item.unit}
          </p>
        </div>
        <div className="cc-card p-5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent)]">
            <i className="fa-solid fa-triangle-exclamation" />
          </span>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            Reorder when ≤
          </p>
          <p className="font-display mt-1 text-2xl font-bold text-[var(--color-primary)]">
            {fmt.format(Number(item.reorder_level))} {item.unit}
          </p>
        </div>
        <div className="cc-card p-5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
            <i className="fa-solid fa-peso-sign" />
          </span>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            Inventory value
          </p>
          <p className="font-display mt-1 text-2xl font-bold text-[var(--color-primary)]">
            {peso.format(Number(item.stock_quantity) * Number(item.cost_per_unit))}
          </p>
        </div>
      </section>

      <section className="cc-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-plus text-[var(--color-accent)]" /> Record movement
        </h2>
        <MovementForm itemId={item.id} unit={item.unit} />
      </section>

      <section className="cc-card overflow-hidden">
        <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
          <i className="fa-solid fa-clock-rotate-left text-[var(--color-primary)]" />
          <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
            Movement history
          </h2>
        </header>
        {history && history.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">When</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Change</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => {
                const positive = Number(m.change_amount) > 0;
                return (
                  <tr
                    key={m.id}
                    className="border-t border-[var(--color-line)] transition-colors hover:bg-[var(--color-primary-50)]/40"
                  >
                    <td className="px-6 py-3 text-[var(--color-muted)]">
                      {formatDateTime(m.created_at)}
                    </td>
                    <td className="px-6 py-3 capitalize">
                      <i
                        className={`fa-solid ${
                          m.reason === "restock"
                            ? "fa-arrow-up text-[var(--color-success)]"
                            : m.reason === "wastage"
                              ? "fa-arrow-down text-[var(--color-danger)]"
                              : "fa-arrows-up-down text-[var(--color-accent)]"
                        } mr-1`}
                      />
                      {m.reason}
                    </td>
                    <td
                      className={`px-6 py-3 font-semibold ${positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
                    >
                      {positive ? "+" : ""}
                      {fmt.format(Number(m.change_amount))} {item.unit}
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
              No history yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
