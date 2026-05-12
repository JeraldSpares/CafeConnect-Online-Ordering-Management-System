import { createClient } from "@/lib/supabase/server";
import { peso, formatDate } from "@/lib/format";
import { Donut, Heatmap, LineChart } from "@/components/charts";

export const dynamic = "force-dynamic";

const PAY_ICONS: Record<string, string> = {
  cash: "fa-money-bills",
  gcash: "fa-mobile-screen-button",
  maya: "fa-mobile-screen-button",
  card: "fa-credit-card",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#c79862",
  preparing: "#3b82f6",
  ready: "#18794e",
  completed: "#1e3932",
  cancelled: "#b3261e",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.min(Math.max(Number(sp.days) || 7, 1), 90);

  const supabase = await createClient();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));
  fromDate.setHours(0, 0, 0, 0);
  const fromIso = fromDate.toISOString();

  // Previous comparable window (for delta vs same-length window prior)
  const prevFromDate = new Date(fromDate);
  prevFromDate.setDate(prevFromDate.getDate() - days);
  const prevToDate = new Date(fromDate);
  const prevFromIso = prevFromDate.toISOString();
  const prevToIso = prevToDate.toISOString();

  const [
    { data: ordersCurrent },
    { data: ordersPrev },
    { data: transactions },
    { data: orderItemsCurrent },
    { data: customerOrders },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total, created_at, order_type, customer_id")
      .gte("created_at", fromIso),
    supabase
      .from("orders")
      .select("id, status, total, created_at")
      .gte("created_at", prevFromIso)
      .lt("created_at", prevToIso),
    supabase
      .from("transactions")
      .select("payment_method, amount, status, created_at, order_id")
      .gte("created_at", fromIso),
    supabase
      .from("order_items")
      .select(
        "item_name, quantity, line_total, orders ( created_at, status ), menu_items ( category_id, categories ( name ) )",
      )
      .gte("orders.created_at", fromIso)
      .limit(5000),
    supabase
      .from("customers")
      .select("id, created_at"),
  ]);

  const cur = ordersCurrent ?? [];
  const prev = ordersPrev ?? [];
  const txs = transactions ?? [];
  const items = orderItemsCurrent ?? [];

  // Helpers
  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
  const pct = (v: number, base: number) =>
    base === 0 ? (v === 0 ? 0 : 100) : ((v - base) / base) * 100;

  // ----- Core metrics -----
  const totalOrders = cur.length;
  const validOrders = cur.filter((o) => o.status !== "cancelled");
  const cancelledOrders = cur.filter((o) => o.status === "cancelled");
  const grossRevenue = sum(validOrders.map((o) => Number(o.total)));
  const paidRevenue = sum(
    txs.filter((t) => t.status === "paid").map((t) => Number(t.amount)),
  );
  const aov = validOrders.length > 0 ? grossRevenue / validOrders.length : 0;
  const cancelRate =
    totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0;
  const collectionRate =
    grossRevenue > 0 ? (paidRevenue / grossRevenue) * 100 : 0;

  // Previous window
  const prevValid = prev.filter((o) => o.status !== "cancelled");
  const prevRevenue = sum(prevValid.map((o) => Number(o.total)));
  const prevAov =
    prevValid.length > 0 ? prevRevenue / prevValid.length : 0;
  const revenueDelta = pct(grossRevenue, prevRevenue);
  const ordersDelta = pct(validOrders.length, prevValid.length);
  const aovDelta = pct(aov, prevAov);

  // ----- Daily series for line chart -----
  const dayLabels: string[] = [];
  const dayRevenue: number[] = [];
  const dayOrders: number[] = [];
  const dayPrevRevenue: number[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayLabels.push(
      new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
      }).format(d),
    );
    const dayTotal = sum(
      validOrders
        .filter((o) => o.created_at.slice(0, 10) === key)
        .map((o) => Number(o.total)),
    );
    dayRevenue.push(dayTotal);
    dayOrders.push(
      validOrders.filter((o) => o.created_at.slice(0, 10) === key).length,
    );

    // Same offset from prev window
    const pd = new Date(prevFromDate);
    pd.setDate(pd.getDate() + i);
    const pkey = pd.toISOString().slice(0, 10);
    dayPrevRevenue.push(
      sum(
        prevValid
          .filter((o) => o.created_at.slice(0, 10) === pkey)
          .map((o) => Number(o.total)),
      ),
    );
  }

  // ----- Hourly × weekday heatmap -----
  // grid[day 0=Mon..6=Sun][hour 0..23] = order count
  const heat: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  for (const o of validOrders) {
    const d = new Date(o.created_at);
    const dayIdx = (d.getDay() + 6) % 7; // Mon=0
    const hour = d.getHours();
    heat[dayIdx][hour] += 1;
  }

  // ----- Categories donut -----
  const catRev = new Map<string, number>();
  for (const oi of items) {
    const order = Array.isArray(oi.orders) ? oi.orders[0] : oi.orders;
    if (!order || order.status === "cancelled") continue;
    const mi = Array.isArray(oi.menu_items) ? oi.menu_items[0] : oi.menu_items;
    const cats = Array.isArray(mi?.categories) ? mi?.categories[0] : mi?.categories;
    const name = cats?.name ?? "Uncategorized";
    catRev.set(name, (catRev.get(name) ?? 0) + Number(oi.line_total));
  }
  const CAT_PALETTE = [
    "#1e3932",
    "#c79862",
    "#3b82f6",
    "#18794e",
    "#b3261e",
    "#7c3aed",
  ];
  const categorySlices = [...catRev.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value: Math.round(value),
      color: CAT_PALETTE[i % CAT_PALETTE.length],
    }));

  // ----- Order status donut -----
  const statusCount: Record<string, number> = {};
  for (const o of cur) statusCount[o.status] = (statusCount[o.status] ?? 0) + 1;
  const statusSlices = Object.entries(statusCount)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      label: k,
      value: v,
      color: STATUS_COLORS[k] ?? "#9ca3af",
    }));

  // ----- Payment methods -----
  const paymentBreakdown = new Map<string, { count: number; amount: number }>();
  for (const t of txs) {
    if (t.status !== "paid") continue;
    const cur = paymentBreakdown.get(t.payment_method) ?? {
      count: 0,
      amount: 0,
    };
    cur.count += 1;
    cur.amount += Number(t.amount);
    paymentBreakdown.set(t.payment_method, cur);
  }

  // ----- Top items -----
  const itemMap = new Map<string, { qty: number; rev: number }>();
  for (const oi of items) {
    const order = Array.isArray(oi.orders) ? oi.orders[0] : oi.orders;
    if (!order || order.status === "cancelled") continue;
    const cur = itemMap.get(oi.item_name) ?? { qty: 0, rev: 0 };
    cur.qty += Number(oi.quantity);
    cur.rev += Number(oi.line_total);
    itemMap.set(oi.item_name, cur);
  }
  const topItems = [...itemMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 10);
  const maxItemRev = Math.max(1, ...topItems.map((t) => t.rev));

  // ----- Customer retention (new vs returning) -----
  const customersInWindow = (customerOrders ?? []).filter((c) => {
    const created = new Date(c.created_at).toISOString();
    return created >= fromIso;
  });
  const customerOrderCount = new Map<string, number>();
  for (const o of validOrders) {
    if (!o.customer_id) continue;
    customerOrderCount.set(
      o.customer_id,
      (customerOrderCount.get(o.customer_id) ?? 0) + 1,
    );
  }
  const returningCustomers = [...customerOrderCount.values()].filter(
    (n) => n > 1,
  ).length;
  const uniqueCustomers = customerOrderCount.size;
  const newCustomers = customersInWindow.length;

  // Order type breakdown
  const dineIn = validOrders.filter((o) => o.order_type === "dine_in").length;
  const takeaway = validOrders.filter(
    (o) => o.order_type === "takeaway",
  ).length;

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            <i className="fa-solid fa-chart-line" /> Analytics
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
            Reports
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Last {days} day{days === 1 ? "" : "s"} · compared to previous {days}{" "}
            day{days === 1 ? "" : "s"} · timezone Asia/Manila
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {[7, 14, 30, 90].map((d) => (
            <a
              key={d}
              href={`/admin/reports?days=${d}`}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                d === days
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-md"
                  : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
              }`}
            >
              <i className="fa-solid fa-calendar-days" /> {d}d
            </a>
          ))}
          <a
            href={`/admin/reports/export?days=${days}`}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110"
          >
            <i className="fa-solid fa-file-csv" /> Export CSV
          </a>
        </nav>
      </header>

      {/* KPI strip */}
      <section
        data-stagger
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      >
        <Kpi
          icon="fa-peso-sign"
          label="Revenue"
          value={peso.format(grossRevenue)}
          delta={revenueDelta}
          accent
        />
        <Kpi
          icon="fa-receipt"
          label="Orders"
          value={String(validOrders.length)}
          delta={ordersDelta}
        />
        <Kpi
          icon="fa-coins"
          label="Avg order value"
          value={peso.format(aov)}
          delta={aovDelta}
        />
        <Kpi
          icon="fa-circle-check"
          label="Collection rate"
          value={`${Math.round(collectionRate)}%`}
          hint={`${peso.format(paidRevenue)} paid`}
        />
        <Kpi
          icon="fa-circle-xmark"
          label="Cancel rate"
          value={`${cancelRate.toFixed(1)}%`}
          hint={`${cancelledOrders.length} cancelled`}
          danger={cancelRate > 10}
        />
      </section>

      {/* Trend line chart */}
      <section className="cc-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-arrow-trend-up" /> Revenue trend
          </h2>
          <span className="text-xs text-[var(--color-muted)]">
            Solid: this {days}d · Dashed: prior {days}d
          </span>
        </header>
        <div className="p-6">
          <LineChart
            labels={dayLabels}
            series={[
              {
                label: `This ${days}d`,
                values: dayRevenue,
                color: "var(--color-primary)",
              },
              {
                label: `Prior ${days}d`,
                values: dayPrevRevenue,
                color: "var(--color-accent)",
                dashed: true,
              },
            ]}
            formatY={(v) => `₱${Math.round(v / 1000)}k`}
            height={240}
          />
        </div>
      </section>

      {/* Heatmap + Donuts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="cc-card overflow-hidden lg:col-span-2">
          <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <i className="fa-solid fa-fire" /> Busy hours
            </h2>
            <span className="text-xs text-[var(--color-muted)]">
              Order count by hour × weekday
            </span>
          </header>
          <div className="p-6">
            <Heatmap
              data={heat}
              formatCell={(v) => `${v} order${v === 1 ? "" : "s"}`}
              emptyHint="Once you start taking orders, peak hours will appear here."
            />
            <p className="mt-3 text-[10px] text-[var(--color-muted)]">
              Darker = busier. Plan staffing around peaks.
            </p>
          </div>
        </section>

        <section className="cc-card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
            <i className="fa-solid fa-chart-pie text-[var(--color-primary)]" />
            <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
              Revenue by category
            </h2>
          </header>
          <div className="p-6">
            {categorySlices.length > 0 ? (
              <Donut
                slices={categorySlices}
                centerValue={peso.format(grossRevenue).replace("PHP", "₱")}
                centerLabel="total"
              />
            ) : (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                No sales yet in this window.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Status + Payment + Order Type row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="cc-card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
            <i className="fa-solid fa-tags text-[var(--color-primary)]" />
            <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
              Order status
            </h2>
          </header>
          <div className="p-6">
            {statusSlices.length > 0 ? (
              <Donut
                slices={statusSlices}
                centerValue={String(totalOrders)}
                centerLabel="orders"
              />
            ) : (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                No orders yet.
              </p>
            )}
          </div>
        </section>

        <section className="cc-card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
            <i className="fa-solid fa-credit-card text-[var(--color-primary)]" />
            <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
              Payment methods
            </h2>
          </header>
          {paymentBreakdown.size > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
                <tr>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Txns</th>
                  <th className="px-5 py-3 text-right">Collected</th>
                </tr>
              </thead>
              <tbody>
                {[...paymentBreakdown.entries()]
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([m, s]) => (
                    <tr key={m} className="border-t border-[var(--color-line)]">
                      <td className="px-5 py-2 capitalize">
                        <i
                          className={`fa-solid ${PAY_ICONS[m] ?? "fa-money-bill"} mr-2 text-[var(--color-primary)]`}
                        />
                        {m}
                      </td>
                      <td className="px-5 py-2">{s.count}</td>
                      <td className="px-5 py-2 text-right font-semibold">
                        {peso.format(s.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted)]">
              No paid transactions yet.
            </p>
          )}
        </section>

        <section className="cc-card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
            <i className="fa-solid fa-users text-[var(--color-primary)]" />
            <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
              Customers
            </h2>
          </header>
          <div className="space-y-3 p-6 text-sm">
            <Row
              label="Unique buyers"
              value={String(uniqueCustomers)}
              icon="fa-user-group"
            />
            <Row
              label="New customers"
              value={String(newCustomers)}
              icon="fa-user-plus"
            />
            <Row
              label="Returning"
              value={String(returningCustomers)}
              icon="fa-rotate-right"
            />
            <div className="my-2 h-px bg-[var(--color-line)]" />
            <Row
              label="Dine-in"
              value={String(dineIn)}
              icon="fa-chair"
            />
            <Row
              label="Takeaway"
              value={String(takeaway)}
              icon="fa-bag-shopping"
            />
          </div>
        </section>
      </div>

      {/* Daily revenue bars */}
      <section className="cc-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-chart-column" /> Daily revenue
          </h2>
        </header>
        <div className="space-y-2 px-6 py-5">
          {dayRevenue.length > 0 ? (
            dayRevenue.map((v, idx) => {
              const max = Math.max(1, ...dayRevenue);
              const width = (v / max) * 100;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-xs animate-fade-up"
                  style={{ animationDelay: `${idx * 0.02}s` }}
                >
                  <div className="w-24 text-[var(--color-muted)]">
                    {formatDate(dayLabels[idx])}
                  </div>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-[var(--color-primary-50)]">
                    <div
                      className="absolute inset-y-0 left-0 origin-left rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-700)] animate-progress"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="w-28 text-right font-semibold text-[var(--color-primary)]">
                    {peso.format(v)}
                  </div>
                  <div className="w-16 text-right text-[var(--color-muted)]">
                    {dayOrders[idx]} ord
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-6 text-center text-sm text-[var(--color-muted)]">
              No data.
            </p>
          )}
        </div>
      </section>

      {/* Top items */}
      <section className="cc-card overflow-hidden">
        <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
          <i className="fa-solid fa-trophy text-[var(--color-accent)]" />
          <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
            Top selling items
          </h2>
        </header>
        {topItems.length > 0 ? (
          <ul className="divide-y divide-[var(--color-line)]" data-stagger>
            {topItems.map((t, i) => (
              <li
                key={t.name}
                className="flex items-center gap-3 px-6 py-3 text-sm"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium text-[var(--color-primary)]">
                      <i className="fa-solid fa-mug-saucer mr-1.5 text-[var(--color-primary)]/60" />
                      {t.name}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {t.qty} sold · {peso.format(t.rev)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-primary-50)]">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] animate-progress"
                      style={{ width: `${(t.rev / maxItemRev) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
            No items sold yet in this window.
          </p>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  delta,
  accent,
  danger,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`cc-card cc-card-hover p-4 ${
        accent ? "border-[var(--color-accent)]" : ""
      } ${danger ? "border-[var(--color-danger)]" : ""}`}
    >
      <div className="flex items-center justify-between">
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
        {delta !== undefined && Number.isFinite(delta) && (
          <Delta value={delta} />
        )}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </p>
      <p className="font-display mt-0.5 text-xl font-bold text-[var(--color-primary)]">
        {value}
      </p>
      {hint && <p className="text-[10px] text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

function Delta({ value }: { value: number }) {
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

function Row({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[var(--color-muted)]">
        <i className={`fa-solid ${icon} text-[var(--color-primary)]`} />
        {label}
      </span>
      <span className="font-semibold text-[var(--color-primary)]">{value}</span>
    </div>
  );
}
