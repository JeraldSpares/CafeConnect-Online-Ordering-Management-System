import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
  preparing: "bg-blue-50 text-blue-800",
  ready: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  completed: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    { count: pendingOrders },
    { count: lowStockItems },
    { data: salesToday },
    { data: recentOrders },
    { count: totalCustomers },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "preparing"]),
    supabase
      .from("inventory_items")
      .select("*", { count: "exact", head: true })
      .lte("stock_quantity", 0)
      .gte("reorder_level", 0),
    supabase
      .from("transactions")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", todayIso),
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, customers ( full_name )")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true }),
  ]);

  const revenueToday =
    salesToday?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  return (
    <div className="space-y-8 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-gauge-high" /> Overview
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Good day, Hebrew&apos;s Cafe
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Here&apos;s what&apos;s happening in your café right now.
        </p>
      </header>

      <section
        data-stagger
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon="fa-receipt"
          label="Active orders"
          value={String(pendingOrders ?? 0)}
          hint="pending + preparing"
          href="/admin/orders"
        />
        <StatCard
          icon="fa-peso-sign"
          label="Revenue today"
          value={peso.format(revenueToday)}
          hint="from paid transactions"
          accent
          href="/admin/reports"
        />
        <StatCard
          icon="fa-triangle-exclamation"
          label="Low stock"
          value={String(lowStockItems ?? 0)}
          hint="at or below reorder level"
          danger={(lowStockItems ?? 0) > 0}
          href="/admin/inventory"
        />
        <StatCard
          icon="fa-users"
          label="Customers"
          value={String(totalCustomers ?? 0)}
          hint="all-time"
          href="/admin/customers"
        />
      </section>

      <section className="cc-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-clock-rotate-left" /> Recent orders
          </h2>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            View all <i className="fa-solid fa-arrow-right" />
          </Link>
        </header>
        {recentOrders && recentOrders.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">Order #</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Placed</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => {
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
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
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
          <div className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
            <i className="fa-solid fa-mug-saucer text-3xl text-[var(--color-primary-200)]" />
            <p className="mt-2">
              No orders yet. They&apos;ll appear here as customers place
              them.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
  accent,
  danger,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const body = (
    <div
      className={`cc-card cc-card-hover relative overflow-hidden p-5 ${
        accent ? "border-[var(--color-accent)]" : ""
      } ${danger ? "border-[var(--color-danger)]" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-full ${
            danger
              ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
              : accent
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
          }`}
        >
          <i className={`fa-solid ${icon}`} />
        </span>
        {href && (
          <i className="fa-solid fa-arrow-up-right-from-square text-xs text-[var(--color-muted)] opacity-50" />
        )}
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </p>
      <p className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
