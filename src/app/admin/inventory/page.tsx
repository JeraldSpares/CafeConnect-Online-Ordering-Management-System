import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { NewInventoryItemForm } from "./new-item-form";
import { MovementForm } from "./movement-form";
import { SortableTH, parseTableParams } from "@/components/pagination";

export const dynamic = "force-dynamic";

const SORT_KEYS = [
  "name",
  "stock_quantity",
  "reorder_level",
  "cost_per_unit",
  "updated_at",
] as const;

function fmtQty(n: number, unit: string) {
  const formatted = new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 3,
  }).format(n);
  return `${formatted} ${unit}`;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { sort, dir, q, raw } = parseTableParams(sp, SORT_KEYS, {
    sort: "name",
    dir: "asc",
  });
  const filter = typeof sp.filter === "string" ? sp.filter : "all";

  const supabase = await createClient();

  let query = supabase
    .from("inventory_items")
    .select(
      "id, name, unit, stock_quantity, reorder_level, cost_per_unit, updated_at",
    )
    .order(sort, { ascending: dir === "asc" });

  if (q) query = query.ilike("name", `%${q}%`);

  const [{ data: items }, { data: recent }, { data: etas }] = await Promise.all([
    query,
    supabase
      .from("inventory_movements")
      .select(
        "id, change_amount, reason, notes, created_at, inventory_items ( name, unit )",
      )
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.rpc("inventory_eta", { p_lookback_days: 14 }),
  ]);

  const etaByItem = new Map<string, { days: number | null; daily: number }>();
  for (const e of etas ?? []) {
    etaByItem.set(e.inventory_item_id, {
      days: e.days_remaining,
      daily: Number(e.daily_consumption),
    });
  }

  const allItems = items ?? [];
  const lowStock = allItems.filter(
    (i) => Number(i.stock_quantity) <= Number(i.reorder_level),
  );
  const visibleItems =
    filter === "low" ? lowStock : filter === "out" ? allItems.filter((i) => Number(i.stock_quantity) <= 0) : allItems;

  const totalValue = allItems.reduce(
    (s, i) => s + Number(i.stock_quantity) * Number(i.cost_per_unit),
    0,
  );

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
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
        </div>
        <Link
          href="/admin/inventory/stock-take"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
        >
          <i className="fa-solid fa-clipboard-check" /> Stock-take mode
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="fa-warehouse" label="Items" value={String(allItems.length)} />
        <Stat
          icon="fa-triangle-exclamation"
          label="At/below reorder"
          value={String(lowStock.length)}
          danger={lowStock.length > 0}
        />
        <Stat
          icon="fa-peso-sign"
          label="Inventory value"
          value={peso.format(totalValue)}
          accent
        />
        <Stat icon="fa-arrow-trend-up" label="Latest movements" value={String(recent?.length ?? 0)} />
      </section>

      <NewInventoryItemForm />

      {/* Search + filter pills */}
      <form
        action="/admin/inventory"
        method="get"
        className="cc-card flex flex-wrap items-center gap-2 p-4"
      >
        <div className="relative min-w-48 flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search inventory item…"
            className="cc-input !pl-10"
          />
        </div>
        {filter !== "all" && (
          <input type="hidden" name="filter" value={filter} />
        )}
        <button type="submit" className="btn-primary">
          <i className="fa-solid fa-magnifying-glass" /> Search
        </button>
        {q && (
          <a
            href={`/admin/inventory${filter !== "all" ? `?filter=${filter}` : ""}`}
            className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-xmark" /> Clear
          </a>
        )}
      </form>

      <nav className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All items", icon: "fa-layer-group" },
          {
            key: "low",
            label: `Low stock (${lowStock.length})`,
            icon: "fa-triangle-exclamation",
          },
          { key: "out", label: "Out of stock", icon: "fa-circle-xmark" },
        ].map((t) => {
          const active = filter === t.key;
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (t.key !== "all") params.set("filter", t.key);
          const qs = params.toString();
          return (
            <Link
              key={t.key}
              href={`/admin/inventory${qs ? `?${qs}` : ""}`}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-md"
                  : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
              }`}
            >
              <i className={`fa-solid ${t.icon}`} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {lowStock.length > 0 && filter !== "low" && (
        <div className="cc-card flex items-start gap-3 border-l-4 border-l-[var(--color-danger)] p-4 text-sm text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation mt-0.5 text-lg" />
          <div className="flex-1">
            <strong>{lowStock.length}</strong> item
            {lowStock.length === 1 ? "" : "s"} at or below reorder level.
          </div>
          <Link
            href={`/admin/inventory?filter=low${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className="rounded-full bg-[var(--color-danger)] px-3 py-1 text-xs font-semibold text-white hover:brightness-110"
          >
            View
          </Link>
        </div>
      )}

      <section className="cc-card overflow-hidden">
        <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
          <i className="fa-solid fa-warehouse text-[var(--color-primary)]" />
          <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
            Stock on hand
          </h2>
          <span className="ml-auto text-xs text-[var(--color-muted)]">
            {visibleItems.length} of {allItems.length}
          </span>
        </header>
        {visibleItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary-50)] text-left">
                <tr>
                  <SortableTH
                    label="Item"
                    sortKey="name"
                    current={sort}
                    dir={dir}
                    pathname="/admin/inventory"
                    searchParams={raw}
                  />
                  <SortableTH
                    label="On hand"
                    sortKey="stock_quantity"
                    current={sort}
                    dir={dir}
                    pathname="/admin/inventory"
                    searchParams={raw}
                  />
                  <SortableTH
                    label="Reorder ≤"
                    sortKey="reorder_level"
                    current={sort}
                    dir={dir}
                    pathname="/admin/inventory"
                    searchParams={raw}
                  />
                  <SortableTH
                    label="Cost"
                    sortKey="cost_per_unit"
                    current={sort}
                    dir={dir}
                    pathname="/admin/inventory"
                    searchParams={raw}
                  />
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]/80">
                    ETA
                  </th>
                  <SortableTH
                    label="Updated"
                    sortKey="updated_at"
                    current={sort}
                    dir={dir}
                    pathname="/admin/inventory"
                    searchParams={raw}
                  />
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]/80">
                    Record movement
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((it) => {
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
                      <td className="px-6 py-3 text-xs">
                        {(() => {
                          const e = etaByItem.get(it.id);
                          if (!e || e.daily === 0)
                            return (
                              <span className="text-[var(--color-muted)]">
                                —
                              </span>
                            );
                          const days = e.days ?? 0;
                          const danger = days < 3;
                          const warn = days < 7;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 ${
                                danger
                                  ? "font-bold text-[var(--color-danger)]"
                                  : warn
                                    ? "font-semibold text-[var(--color-accent)]"
                                    : "text-[var(--color-muted)]"
                              }`}
                              title={`Avg ${e.daily.toFixed(2)} ${it.unit}/day`}
                            >
                              <i
                                className={`fa-solid ${
                                  danger
                                    ? "fa-fire animate-pulse"
                                    : warn
                                      ? "fa-triangle-exclamation"
                                      : "fa-hourglass-half"
                                }`}
                              />
                              ~{days}d
                            </span>
                          );
                        })()}
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
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <i className="fa-solid fa-box-open text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {q
                ? `No items match "${q}".`
                : filter === "low"
                  ? "Nothing is low on stock — nice."
                  : "No inventory items yet."}
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
          <div className="overflow-x-auto">
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
          </div>
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

function Stat({
  icon,
  label,
  value,
  accent,
  danger,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`cc-card cc-card-hover p-4 ${
        danger ? "border-[var(--color-danger)]" : ""
      } ${accent ? "border-[var(--color-accent)]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-full ${
            danger
              ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
              : accent
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
          }`}
        >
          <i className={`fa-solid ${icon}`} />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            {label}
          </p>
          <p className="font-display text-lg font-bold text-[var(--color-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
