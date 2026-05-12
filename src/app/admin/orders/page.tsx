import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { RealtimeIndicator } from "./realtime-indicator";
import {
  Pagination,
  SortableTH,
  parseTableParams,
} from "@/components/pagination";

export const dynamic = "force-dynamic";

const STATUS_TABS: { key: string; label: string; icon: string }[] = [
  { key: "active",     label: "Active",     icon: "fa-fire" },
  { key: "pending",    label: "Pending",    icon: "fa-hourglass-start" },
  { key: "preparing",  label: "Preparing",  icon: "fa-mug-hot" },
  { key: "ready",      label: "Ready",      icon: "fa-bell" },
  { key: "completed",  label: "Completed",  icon: "fa-circle-check" },
  { key: "cancelled",  label: "Cancelled",  icon: "fa-circle-xmark" },
  { key: "all",        label: "All",        icon: "fa-layer-group" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
  preparing: "bg-blue-50 text-blue-800",
  ready: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  completed: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

const SORT_KEYS = ["created_at", "total", "status", "order_number"] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, perPage, sort, dir, q, raw } = parseTableParams(sp, SORT_KEYS, {
    sort: "created_at",
    dir: "desc",
    perPage: 15,
  });
  const filter =
    typeof sp.status === "string" ? sp.status : "active";

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, order_type, total, created_at, customers ( full_name )",
      { count: "exact" },
    )
    .order(sort, { ascending: dir === "asc" })
    .range((page - 1) * perPage, page * perPage - 1);

  if (filter === "active") {
    query = query.in("status", ["pending", "preparing", "ready"]);
  } else if (filter !== "all") {
    query = query.eq("status", filter);
  }

  if (q) {
    query = query.ilike("order_number", `%${q}%`);
  }

  const { data: orders, count } = await query;
  const total = count ?? 0;

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            <i className="fa-solid fa-receipt" /> Order Queue
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
            Orders
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Manage incoming orders, update status, and confirm payment.
          </p>
        </div>
        <RealtimeIndicator />
      </header>

      {/* Search + filters */}
      <form
        action="/admin/orders"
        method="get"
        className="cc-card flex flex-wrap items-center gap-2 p-4"
      >
        <div className="relative min-w-48 flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search order number (e.g. 20260512)…"
            className="cc-input !pl-10"
          />
        </div>
        {filter !== "active" && filter !== "all" && (
          <input type="hidden" name="status" value={filter} />
        )}
        <button type="submit" className="btn-primary">
          <i className="fa-solid fa-magnifying-glass" /> Search
        </button>
        {q && (
          <a
            href={`/admin/orders${filter !== "active" ? `?status=${filter}` : ""}`}
            className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-xmark" /> Clear
          </a>
        )}
      </form>

      {/* Status filter pills */}
      <nav className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2">
        {STATUS_TABS.map((t) => {
          const active = filter === t.key;
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (t.key !== "active") params.set("status", t.key);
          const qs = params.toString();
          return (
            <Link
              key={t.key}
              href={`/admin/orders${qs ? `?${qs}` : ""}`}
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

      <section className="cc-card overflow-hidden">
        {orders && orders.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-primary-50)] text-left">
                  <tr>
                    <SortableTH
                      label="Order #"
                      sortKey="order_number"
                      current={sort}
                      dir={dir}
                      pathname="/admin/orders"
                      searchParams={raw}
                    />
                    <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]/80">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]/80">
                      Type
                    </th>
                    <SortableTH
                      label="Status"
                      sortKey="status"
                      current={sort}
                      dir={dir}
                      pathname="/admin/orders"
                      searchParams={raw}
                    />
                    <SortableTH
                      label="Total"
                      sortKey="total"
                      current={sort}
                      dir={dir}
                      pathname="/admin/orders"
                      searchParams={raw}
                    />
                    <SortableTH
                      label="Placed"
                      sortKey="created_at"
                      current={sort}
                      dir={dir}
                      pathname="/admin/orders"
                      searchParams={raw}
                    />
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const customer = Array.isArray(o.customers)
                      ? o.customers[0]
                      : o.customers;
                    return (
                      <tr
                        key={o.id}
                        className="border-t border-[var(--color-line)] transition-colors hover:bg-[var(--color-primary-50)]/40"
                      >
                        <td className="px-6 py-3 font-mono text-[var(--color-primary)]">
                          {o.order_number}
                        </td>
                        <td className="px-6 py-3">
                          {customer?.full_name ?? "Walk-in"}
                        </td>
                        <td className="px-6 py-3 text-xs text-[var(--color-muted)]">
                          <i
                            className={`fa-solid ${o.order_type === "dine_in" ? "fa-chair" : "fa-bag-shopping"}`}
                          />{" "}
                          {o.order_type === "dine_in" ? "Dine-in" : "Takeaway"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`chip ${STATUS_COLOR[o.status] ?? "bg-zinc-100"}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-semibold">
                          {peso.format(Number(o.total))}
                        </td>
                        <td className="px-6 py-3 text-[var(--color-muted)]">
                          {formatDateTime(o.created_at)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
                          >
                            Open <i className="fa-solid fa-arrow-right" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              pathname="/admin/orders"
              searchParams={raw}
              page={page}
              perPage={perPage}
              total={total}
            />
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <i className="fa-solid fa-inbox text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {q
                ? `No orders match "${q}".`
                : "No orders in this view."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
