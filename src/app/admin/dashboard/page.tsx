import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { Donut, HourlyBars, Sparkline } from "@/components/charts";
import { loadSettings } from "@/lib/app-settings";
import { RevenueGoalCard } from "./revenue-goal";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
  preparing: "bg-blue-50 text-blue-800",
  ready: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  completed: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

const STATUS_DONUT_COLORS: Record<string, string> = {
  pending: "#c79862",
  preparing: "#3b82f6",
  ready: "#18794e",
  completed: "#1e3932",
  cancelled: "#b3261e",
};

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return { phrase: "Good morning", icon: "fa-sun" };
  if (h < 18) return { phrase: "Good afternoon", icon: "fa-mug-hot" };
  return { phrase: "Good evening", icon: "fa-moon" };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const settings = await loadSettings();

  // Monthly revenue accumulated so far
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: monthlyPaid } = await supabase
    .from("transactions")
    .select("amount")
    .eq("status", "paid")
    .gte("created_at", monthStart.toISOString());
  const revenueThisMonth =
    monthlyPaid?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;

  const [
    { data: profile },
    { count: activeOrders },
    { count: lowStockCount },
    { count: totalCustomers },
    { data: paidToday },
    { data: paidYesterday },
    { data: ordersWindow },
    { data: ordersForCharts },
    { data: itemsSold },
    { data: recentOrders },
    { data: recentMovements },
    { data: recentPayments },
  ] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "preparing"]),
    supabase
      .from("inventory_items")
      .select("*", { count: "exact", head: true })
      .lte("stock_quantity", 0),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("amount, created_at")
      .eq("status", "paid")
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("transactions")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", startOfYesterday.toISOString())
      .lt("created_at", startOfToday.toISOString()),
    supabase.rpc("sales_summary", { p_days: 7 }),
    supabase
      .from("orders")
      .select("status, created_at, total")
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("order_items")
      .select("item_name, quantity, line_total, orders ( created_at, status )")
      .gte("orders.created_at", startOfToday.toISOString())
      .limit(500),
    supabase
      .from("orders")
      .select(
        "id, order_number, status, total, created_at, customers ( full_name )",
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("inventory_movements")
      .select(
        "id, change_amount, reason, created_at, inventory_items ( name, unit )",
      )
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("transactions")
      .select(
        "id, payment_method, amount, status, created_at, orders ( order_number )",
      )
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const revenueToday =
    paidToday?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const revenueYesterday =
    paidYesterday?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const revenueDeltaPct =
    revenueYesterday > 0
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
      : revenueToday > 0
        ? 100
        : 0;

  // 7-day sparkline series
  const sparkSeries =
    ((ordersWindow ?? []) as Array<{ paid_revenue: number | string }>).map(
      (r) => Number(r.paid_revenue),
    ) || [];

  // Hourly bars (today)
  const hourBuckets = Array.from({ length: 24 }, () => 0);
  for (const o of ordersForCharts ?? []) {
    if (o.status === "cancelled") continue;
    const h = new Date(o.created_at).getHours();
    hourBuckets[h] += Number(o.total);
  }
  // Compress to 6 bars (4-hour blocks) for readability
  const hourLabels = ["6a", "10a", "2p", "6p", "10p", "2a"];
  const compressedBars = [
    hourBuckets.slice(6, 10).reduce((a, b) => a + b, 0),
    hourBuckets.slice(10, 14).reduce((a, b) => a + b, 0),
    hourBuckets.slice(14, 18).reduce((a, b) => a + b, 0),
    hourBuckets.slice(18, 22).reduce((a, b) => a + b, 0),
    hourBuckets.slice(22, 24).reduce((a, b) => a + b, 0),
    hourBuckets.slice(0, 6).reduce((a, b) => a + b, 0),
  ];
  const currentBlock = (() => {
    const h = now.getHours();
    if (h >= 6 && h < 10) return 0;
    if (h >= 10 && h < 14) return 1;
    if (h >= 14 && h < 18) return 2;
    if (h >= 18 && h < 22) return 3;
    if (h >= 22) return 4;
    return 5;
  })();

  // Status donut
  const statusCounts: Record<string, number> = {};
  for (const o of ordersForCharts ?? []) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }
  const donutSlices = (
    ["pending", "preparing", "ready", "completed", "cancelled"] as const
  )
    .filter((k) => (statusCounts[k] ?? 0) > 0)
    .map((k) => ({
      label: k,
      value: statusCounts[k],
      color: STATUS_DONUT_COLORS[k],
    }));

  // Top items today
  const itemMap = new Map<string, { qty: number; rev: number }>();
  for (const oi of itemsSold ?? []) {
    const o = Array.isArray(oi.orders) ? oi.orders[0] : oi.orders;
    if (!o || o.status === "cancelled") continue;
    const cur = itemMap.get(oi.item_name) ?? { qty: 0, rev: 0 };
    cur.qty += Number(oi.quantity);
    cur.rev += Number(oi.line_total);
    itemMap.set(oi.item_name, cur);
  }
  const topItems = [...itemMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const maxQty = Math.max(1, ...topItems.map((t) => t.qty));

  // Combined activity feed
  const activity = [
    ...(recentOrders ?? []).map((o) => {
      const c = Array.isArray(o.customers) ? o.customers[0] : o.customers;
      return {
        kind: "order" as const,
        at: o.created_at,
        title: `${c?.full_name ?? "Walk-in"} placed ${o.order_number}`,
        meta: `${peso.format(Number(o.total))} · ${o.status}`,
        href: `/admin/orders/${o.id}`,
        icon: "fa-receipt",
        color: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
      };
    }),
    ...(recentPayments ?? []).map((p) => {
      const o = Array.isArray(p.orders) ? p.orders[0] : p.orders;
      return {
        kind: "payment" as const,
        at: p.created_at,
        title: `Payment ${p.status}: ${peso.format(Number(p.amount))}`,
        meta: `${p.payment_method} · ${o?.order_number ?? ""}`,
        href: "/admin/reports",
        icon:
          p.payment_method === "cash"
            ? "fa-money-bills"
            : p.payment_method === "card"
              ? "fa-credit-card"
              : "fa-mobile-screen-button",
        color: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
      };
    }),
    ...(recentMovements ?? []).map((m) => {
      const it = Array.isArray(m.inventory_items)
        ? m.inventory_items[0]
        : m.inventory_items;
      const positive = Number(m.change_amount) > 0;
      return {
        kind: "inventory" as const,
        at: m.created_at,
        title: `${m.reason}: ${it?.name ?? "—"}`,
        meta: `${positive ? "+" : ""}${Number(m.change_amount).toFixed(2)} ${it?.unit ?? ""}`,
        href: "/admin/inventory",
        icon: positive ? "fa-arrow-up" : "fa-arrow-down",
        color: positive
          ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
          : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
      };
    }),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 10);

  const { phrase, icon: greetIcon } = greeting(now);

  return (
    <div className="space-y-6 p-6 md:p-8 animate-fade-up">
      {/* GREETING + QUICK ACTIONS */}
      <header className="cc-card relative overflow-hidden p-6 sm:p-8">
        <div
          className="cc-bean"
          style={{ width: 240, height: 160, top: -40, right: -40, opacity: 0.1 }}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
              <i className={`fa-solid ${greetIcon}`} /> {phrase}
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)] sm:text-4xl">
              Welcome back,{" "}
              <span className="text-[var(--color-accent)]">
                {profile?.full_name?.split(" ")[0] ??
                  user?.email?.split("@")[0] ??
                  "there"}
              </span>
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {now.toLocaleDateString("en-PH", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              ·{" "}
              {now.toLocaleTimeString("en-PH", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/pos" className="btn-primary">
              <i className="fa-solid fa-cash-register" /> New order
            </Link>
            <Link href="/admin/orders" className="btn-ghost">
              <i className="fa-solid fa-receipt" /> Queue
            </Link>
            <Link href="/admin/menu" className="btn-ghost">
              <i className="fa-solid fa-utensils" /> Menu
            </Link>
          </div>
        </div>
      </header>

      {/* KPI CARDS */}
      <section
        data-stagger
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon="fa-receipt"
          label="Active orders"
          value={String(activeOrders ?? 0)}
          hint="pending + preparing"
          href="/admin/orders"
        />
        <StatCard
          icon="fa-peso-sign"
          label="Revenue today"
          value={peso.format(revenueToday)}
          delta={revenueDeltaPct}
          hint="vs yesterday"
          href="/admin/reports"
          accent
          spark={sparkSeries}
        />
        <StatCard
          icon="fa-triangle-exclamation"
          label="Out of stock"
          value={String(lowStockCount ?? 0)}
          hint="items at zero"
          href="/admin/inventory"
          danger={(lowStockCount ?? 0) > 0}
        />
        <StatCard
          icon="fa-users"
          label="Customers"
          value={String(totalCustomers ?? 0)}
          hint="all-time records"
          href="/admin/customers"
        />
      </section>

      {/* REVENUE GOAL */}
      <RevenueGoalCard goal={settings.revenue_goal_monthly} earned={revenueThisMonth} />

      {/* CHARTS ROW */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hourly bars */}
        <div className="cc-card p-6 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
                <i className="fa-solid fa-chart-column" /> Revenue today
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Grouped by 4-hour blocks
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-[var(--color-primary)]">
                {peso.format(revenueToday)}
              </p>
              <DeltaBadge value={revenueDeltaPct} />
            </div>
          </div>
          <HourlyBars
            values={compressedBars}
            labels={hourLabels}
            highlightIndex={currentBlock}
          />
        </div>

        {/* Status donut */}
        <div className="cc-card p-6">
          <h2 className="mb-3 font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-chart-pie" /> Order status
          </h2>
          {donutSlices.length > 0 ? (
            <Donut
              slices={donutSlices}
              centerValue={String(
                donutSlices.reduce((s, x) => s + x.value, 0),
              )}
              centerLabel="orders"
            />
          ) : (
            <div className="grid place-items-center py-10 text-center text-sm text-[var(--color-muted)]">
              <i className="fa-solid fa-mug-saucer text-3xl text-[var(--color-primary-200)]" />
              <p className="mt-2">No orders yet today.</p>
            </div>
          )}
        </div>
      </section>

      {/* TOP ITEMS + ACTIVITY */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="cc-card p-6 lg:col-span-1">
          <h2 className="mb-4 font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-trophy text-[var(--color-accent)]" /> Top
            today
          </h2>
          {topItems.length > 0 ? (
            <ul className="space-y-3" data-stagger>
              {topItems.map((it, i) => (
                <li key={it.name} className="text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="flex items-center gap-2 text-[var(--color-primary)]">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                          i === 0
                            ? "bg-[var(--color-accent)] text-white"
                            : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium">{it.name}</span>
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {it.qty} · {peso.format(it.rev)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-primary-50)]">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] animate-progress"
                      style={{ width: `${(it.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center text-sm text-[var(--color-muted)]">
              <i className="fa-solid fa-mug-saucer text-3xl text-[var(--color-primary-200)]" />
              <p className="mt-2">No items sold today yet.</p>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="cc-card p-6 lg:col-span-2">
          <h2 className="mb-4 font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-clock-rotate-left" /> Recent activity
          </h2>
          {activity.length > 0 ? (
            <ul className="space-y-3" data-stagger>
              {activity.map((a, i) => (
                <li
                  key={`${a.kind}-${i}-${a.at}`}
                  className="flex items-center gap-3"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.color}`}
                  >
                    <i className={`fa-solid ${a.icon} text-sm`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-primary)]">
                      {a.title}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {a.meta} · {formatDateTime(a.at)}
                    </p>
                  </div>
                  <Link
                    href={a.href}
                    className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    Open <i className="fa-solid fa-arrow-right" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center text-sm text-[var(--color-muted)]">
              <i className="fa-solid fa-inbox text-3xl text-[var(--color-primary-200)]" />
              <p className="mt-2">No activity yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* RECENT ORDERS TABLE */}
      <section className="cc-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-receipt" /> Recent orders
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
                const c = Array.isArray(o.customers)
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
                      {c?.full_name ?? "Walk-in"}
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
              No orders yet. They&apos;ll show up here as customers place them.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DeltaBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        positive
          ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
          : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
      }`}
    >
      <i className={`fa-solid ${positive ? "fa-arrow-up" : "fa-arrow-down"}`} />
      {Math.abs(value).toFixed(0)}%
    </span>
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
  delta,
  spark,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  accent?: boolean;
  danger?: boolean;
  delta?: number;
  spark?: number[];
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
        {delta !== undefined && <DeltaBadge value={delta} />}
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </p>
      <p className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
        {value}
      </p>
      <div className="mt-1 flex items-center justify-between">
        {hint && (
          <p className="text-xs text-[var(--color-muted)]">{hint}</p>
        )}
        {spark && spark.length > 1 && (
          <Sparkline values={spark} width={70} height={24} />
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
