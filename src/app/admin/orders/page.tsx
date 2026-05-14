import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { RealtimeIndicator } from "./realtime-indicator";
import { Pagination, parseTableParams } from "@/components/pagination";

export const dynamic = "force-dynamic";

const STATUS_TABS: { key: string; label: string; icon: string }[] = [
  { key: "all",        label: "All",        icon: "fa-layer-group" },
  { key: "active",     label: "Active",     icon: "fa-fire" },
  { key: "pending",    label: "Pending",    icon: "fa-hourglass-start" },
  { key: "preparing",  label: "Preparing",  icon: "fa-mug-hot" },
  { key: "ready",      label: "Ready",      icon: "fa-bell" },
  { key: "completed",  label: "Completed",  icon: "fa-circle-check" },
  { key: "cancelled",  label: "Cancelled",  icon: "fa-circle-xmark" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
  preparing: "bg-blue-50 text-blue-800",
  ready: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  completed: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

const KANBAN_COLUMNS: { key: string; label: string; icon: string; tint: string }[] = [
  { key: "pending",    label: "Pending",    icon: "fa-hourglass-start", tint: "border-t-[var(--color-accent)]" },
  { key: "preparing",  label: "Preparing",  icon: "fa-mug-hot",         tint: "border-t-blue-500" },
  { key: "ready",      label: "Ready",      icon: "fa-bell",            tint: "border-t-[var(--color-success)]" },
  { key: "completed",  label: "Completed",  icon: "fa-circle-check",    tint: "border-t-[var(--color-primary)]" },
  { key: "cancelled",  label: "Cancelled",  icon: "fa-circle-xmark",    tint: "border-t-[var(--color-danger)]" },
];

const SORT_KEYS = ["created_at", "total", "status", "order_number"] as const;

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  total: number;
  created_at: string;
  customers: { full_name: string } | { full_name: string }[] | null;
};

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
  const filter = typeof sp.status === "string" ? sp.status : "all";
  const view = sp.view === "kanban" ? "kanban" : "list";

  const supabase = await createClient();

  if (view === "kanban") {
    // Fetch up to 200 most-recent orders; group client-side into status columns.
    let query = supabase
      .from("orders")
      .select(
        "id, order_number, status, order_type, total, created_at, customers ( full_name )",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (q) query = query.ilike("order_number", `%${q}%`);
    const { data: orders } = await query;
    return renderShell({
      raw,
      q,
      filter,
      view,
      content: (
        <KanbanBoard
          orders={(orders ?? []) as OrderRow[]}
          query={q}
        />
      ),
    });
  }

  // -------- list view --------
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
  if (q) query = query.ilike("order_number", `%${q}%`);

  const { data: orders, count } = await query;
  const total = count ?? 0;

  return renderShell({
    raw,
    q,
    filter,
    view,
    content: (
      <div className="space-y-4">
        {/* Sort bar — moves sort control out of the table */}
        {orders && orders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--color-muted)]">
              <strong className="text-[var(--color-primary)]">{total}</strong>{" "}
              order{total === 1 ? "" : "s"} · sorted by{" "}
              <strong className="text-[var(--color-primary)]">
                {sort === "created_at"
                  ? "placed"
                  : sort === "order_number"
                    ? "order #"
                    : sort}
              </strong>{" "}
              ({dir})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["created_at", "Placed"],
                  ["total", "Total"],
                  ["status", "Status"],
                  ["order_number", "Order #"],
                ] as const
              ).map(([key, label]) => {
                const isActive = sort === key;
                const nextDir =
                  isActive && dir === "asc" ? "desc" : "asc";
                const params = new URLSearchParams();
                Object.entries(raw).forEach(([k, v]) => {
                  if (
                    v !== undefined &&
                    v !== "" &&
                    k !== "sort" &&
                    k !== "dir" &&
                    k !== "page"
                  ) {
                    params.set(k, v);
                  }
                });
                params.set("sort", key);
                params.set("dir", nextDir);
                return (
                  <Link
                    key={key}
                    href={`/admin/orders?${params.toString()}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <i
                        className={`fa-solid ${dir === "asc" ? "fa-arrow-up" : "fa-arrow-down"} text-[9px]`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {orders && orders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(orders as OrderRow[]).map((o) => {
                const customer = Array.isArray(o.customers)
                  ? o.customers[0]
                  : o.customers;
                return (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    className="cc-card cc-card-hover group flex flex-col gap-3 p-4 focus-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-[var(--color-primary)]">
                          {o.order_number}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">
                          <i className="fa-solid fa-user mr-1 text-[var(--color-muted)]" />
                          {customer?.full_name ?? "Walk-in"}
                        </p>
                      </div>
                      <span
                        className={`chip shrink-0 ${STATUS_COLOR[o.status] ?? "bg-zinc-100"}`}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div className="text-xs text-[var(--color-muted)]">
                        <p>
                          <i
                            className={`fa-solid ${o.order_type === "dine_in" ? "fa-chair" : "fa-bag-shopping"} mr-1`}
                          />
                          {o.order_type === "dine_in"
                            ? "Dine-in"
                            : "Takeaway"}
                        </p>
                        <p className="mt-0.5">
                          <i className="fa-solid fa-clock mr-1" />
                          {formatDateTime(o.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold text-[var(--color-primary)]">
                          {peso.format(Number(o.total))}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-[var(--color-primary)] opacity-0 transition-opacity group-hover:opacity-100">
                          Open <i className="fa-solid fa-arrow-right" />
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="cc-card overflow-hidden">
              <Pagination
                pathname="/admin/orders"
                searchParams={raw}
                page={page}
                perPage={perPage}
                total={total}
              />
            </div>
          </>
        ) : (
          <section className="cc-card px-6 py-12 text-center">
            <i className="fa-solid fa-inbox text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {q ? `No orders match "${q}".` : "No orders in this view."}
            </p>
          </section>
        )}
      </div>
    ),
  });
}

function renderShell({
  raw,
  q,
  filter,
  view,
  content,
}: {
  raw: Record<string, string | undefined>;
  q: string;
  filter: string;
  view: "list" | "kanban";
  content: React.ReactNode;
}) {
  const buildHref = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    Object.entries(raw).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, v);
    });
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === null) params.delete(k);
      else params.set(k, v);
    });
    // The list-view default is `status=all` and `view=list` — strip them for clean URLs.
    if (params.get("status") === "all") params.delete("status");
    if (params.get("view") === "list") params.delete("view");
    params.delete("page");
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };

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
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex overflow-hidden rounded-full border border-[var(--color-line)] bg-white">
            <Link
              href={buildHref({ view: "list" })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === "list"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
              }`}
            >
              <i className="fa-solid fa-list" /> List
            </Link>
            <Link
              href={buildHref({ view: "kanban" })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === "kanban"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
              }`}
            >
              <i className="fa-solid fa-columns" /> Kanban
            </Link>
          </div>
          <RealtimeIndicator />
        </div>
      </header>

      {/* Search */}
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
        {filter !== "all" && (
          <input type="hidden" name="status" value={filter} />
        )}
        {view !== "list" && (
          <input type="hidden" name="view" value={view} />
        )}
        <button type="submit" className="btn-primary">
          <i className="fa-solid fa-magnifying-glass" /> Search
        </button>
        {q && (
          <Link
            href={buildHref({ q: null })}
            className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-xmark" /> Clear
          </Link>
        )}
      </form>

      {/* Status filter pills — list view only */}
      {view === "list" && (
        <nav className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2">
          {STATUS_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <Link
                key={t.key}
                href={buildHref({
                  status: t.key === "all" ? null : t.key,
                })}
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
      )}

      {content}
    </div>
  );
}

function KanbanBoard({
  orders,
  query,
}: {
  orders: OrderRow[];
  query: string;
}) {
  // Bucket by status
  const buckets = new Map<string, OrderRow[]>();
  for (const o of orders) {
    const arr = buckets.get(o.status) ?? [];
    arr.push(o);
    buckets.set(o.status, arr);
  }

  if (orders.length === 0) {
    return (
      <div className="cc-card px-6 py-16 text-center">
        <i className="fa-solid fa-inbox text-4xl text-[var(--color-primary-200)]" />
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {query
            ? `No orders match "${query}".`
            : "No orders yet — they'll appear here as customers place them."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {KANBAN_COLUMNS.map((col) => {
        const items = buckets.get(col.key) ?? [];
        return (
          <section
            key={col.key}
            className={`flex flex-col rounded-2xl border border-t-4 ${col.tint} border-[var(--color-line)] bg-white shadow-sm`}
          >
            <header className="flex items-center justify-between px-4 py-3">
              <h2 className="font-display flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]">
                <i className={`fa-solid ${col.icon}`} />
                {col.label}
              </h2>
              <span className="rounded-full bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                {items.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 px-3 pb-3">
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--color-line)] py-6 text-center text-xs text-[var(--color-muted)]">
                  Empty
                </p>
              ) : (
                items.map((o) => (
                  <KanbanCard key={o.id} order={o} status={col.key} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KanbanCard({ order, status }: { order: OrderRow; status: string }) {
  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className="block rounded-xl border border-[var(--color-line)] bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary-200)] hover:shadow-md"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate font-mono text-xs font-semibold text-[var(--color-primary)]">
          {order.order_number}
        </p>
        <span
          className={`chip text-[9px] ${STATUS_COLOR[status] ?? "bg-zinc-100"}`}
        >
          {status}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-[var(--color-text)]">
        <i className="fa-solid fa-user mr-1 text-[var(--color-muted)]" />
        {customer?.full_name ?? "Walk-in"}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>
          <i
            className={`fa-solid ${order.order_type === "dine_in" ? "fa-chair" : "fa-bag-shopping"} mr-1`}
          />
          {order.order_type === "dine_in" ? "Dine-in" : "Takeaway"}
        </span>
        <span className="font-display font-bold text-[var(--color-primary)]">
          {peso.format(Number(order.total))}
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--color-muted)]">
        {formatDateTime(order.created_at)}
      </p>
    </Link>
  );
}
