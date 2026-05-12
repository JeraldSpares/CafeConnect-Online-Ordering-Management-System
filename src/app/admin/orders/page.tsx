import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { RealtimeIndicator } from "./realtime-indicator";

export const dynamic = "force-dynamic";

const STATUS_TABS: { key: string; label: string; icon: string }[] = [
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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.status ?? "active";

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, order_type, total, created_at, customers ( full_name )",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "active") {
    query = query.in("status", ["pending", "preparing", "ready"]);
  } else if (STATUS_TABS.some((t) => t.key === filter && t.key !== "active")) {
    query = query.eq("status", filter);
  }

  const { data: orders } = await query;

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

      <nav className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2">
        {STATUS_TABS.map((t) => {
          const active = filter === t.key;
          return (
            <Link
              key={t.key}
              href={`/admin/orders${t.key === "active" ? "" : `?status=${t.key}`}`}
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
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">Order #</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Placed</th>
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
        ) : (
          <div className="px-6 py-12 text-center">
            <i className="fa-solid fa-inbox text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No orders in this view.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
