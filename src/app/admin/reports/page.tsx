import { createClient } from "@/lib/supabase/server";
import { peso, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type SalesRow = {
  day: string;
  order_count: number;
  gross_revenue: number;
  paid_revenue: number;
};

const PAY_ICONS: Record<string, string> = {
  cash: "fa-money-bills",
  gcash: "fa-mobile-screen-button",
  maya: "fa-mobile-screen-button",
  card: "fa-credit-card",
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

  const [{ data: sales }, { data: transactions }, { data: topItems }] =
    await Promise.all([
      supabase.rpc("sales_summary", { p_days: days }),
      supabase
        .from("transactions")
        .select("payment_method, amount, status, created_at")
        .gte("created_at", fromIso),
      supabase
        .from("order_items")
        .select("item_name, quantity, line_total, orders ( created_at, status )")
        .gte("orders.created_at", fromIso),
    ]);

  const salesRows = (sales ?? []) as SalesRow[];
  const totals = salesRows.reduce(
    (acc, r) => {
      acc.orders += Number(r.order_count);
      acc.gross += Number(r.gross_revenue);
      acc.paid += Number(r.paid_revenue);
      return acc;
    },
    { orders: 0, gross: 0, paid: 0 },
  );

  const paymentBreakdown = new Map<string, { count: number; amount: number }>();
  for (const t of transactions ?? []) {
    if (t.status !== "paid") continue;
    const cur = paymentBreakdown.get(t.payment_method) ?? {
      count: 0,
      amount: 0,
    };
    cur.count += 1;
    cur.amount += Number(t.amount);
    paymentBreakdown.set(t.payment_method, cur);
  }

  const itemSummary = new Map<
    string,
    { quantity: number; revenue: number }
  >();
  for (const oi of topItems ?? []) {
    const order = Array.isArray(oi.orders) ? oi.orders[0] : oi.orders;
    if (!order || order.status === "cancelled") continue;
    const cur = itemSummary.get(oi.item_name) ?? { quantity: 0, revenue: 0 };
    cur.quantity += Number(oi.quantity);
    cur.revenue += Number(oi.line_total);
    itemSummary.set(oi.item_name, cur);
  }
  const topRanked = [...itemSummary.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const maxDayRevenue = Math.max(
    1,
    ...salesRows.map((r) => Number(r.gross_revenue)),
  );

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            <i className="fa-solid fa-chart-line" /> Financial Reports
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
            Reports
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Last {days} day{days === 1 ? "" : "s"} · timezone Asia/Manila
          </p>
        </div>
        <nav className="flex gap-2">
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
        </nav>
      </header>

      <section data-stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="fa-receipt" label="Orders" value={String(totals.orders)} />
        <StatCard icon="fa-peso-sign" label="Gross revenue" value={peso.format(totals.gross)} />
        <StatCard
          icon="fa-circle-check"
          label="Collected (paid)"
          value={peso.format(totals.paid)}
          hint={
            totals.gross > 0
              ? `${Math.round((totals.paid / totals.gross) * 100)}% collection rate`
              : undefined
          }
          accent
        />
      </section>

      <section className="cc-card overflow-hidden">
        <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
          <i className="fa-solid fa-chart-column text-[var(--color-primary)]" />
          <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
            Daily revenue
          </h2>
        </header>
        <div className="space-y-2 px-6 py-5">
          {salesRows.map((r, idx) => {
            const width = (Number(r.gross_revenue) / maxDayRevenue) * 100;
            return (
              <div
                key={r.day}
                className="flex items-center gap-3 text-xs animate-fade-up"
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <div className="w-24 text-[var(--color-muted)]">
                  {formatDate(r.day)}
                </div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-[var(--color-primary-50)]">
                  <div
                    className="absolute inset-y-0 left-0 origin-left rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-700)] animate-progress"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="w-28 text-right font-semibold text-[var(--color-primary)]">
                  {peso.format(Number(r.gross_revenue))}
                </div>
                <div className="w-16 text-right text-[var(--color-muted)]">
                  {r.order_count} ord
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Txns</th>
                  <th className="px-6 py-3 text-right">Collected</th>
                </tr>
              </thead>
              <tbody>
                {[...paymentBreakdown.entries()]
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([m, s]) => (
                    <tr
                      key={m}
                      className="border-t border-[var(--color-line)]"
                    >
                      <td className="px-6 py-3 capitalize">
                        <i
                          className={`fa-solid ${PAY_ICONS[m] ?? "fa-money-bill"} mr-2 text-[var(--color-primary)]`}
                        />
                        {m}
                      </td>
                      <td className="px-6 py-3">{s.count}</td>
                      <td className="px-6 py-3 text-right font-semibold">
                        {peso.format(s.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
              <i className="fa-solid fa-inbox text-3xl text-[var(--color-primary-200)]" />
              <p className="mt-2">No paid transactions in this window.</p>
            </div>
          )}
        </section>

        <section className="cc-card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
            <i className="fa-solid fa-trophy text-[var(--color-accent)]" />
            <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
              Top items
            </h2>
          </header>
          {topRanked.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
                <tr>
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3">Qty sold</th>
                  <th className="px-6 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topRanked.map((t, i) => (
                  <tr
                    key={t.name}
                    className="border-t border-[var(--color-line)]"
                  >
                    <td className="px-6 py-3 font-bold text-[var(--color-accent)]">
                      {i + 1}
                    </td>
                    <td className="px-6 py-3">
                      <i className="fa-solid fa-mug-saucer mr-2 text-[var(--color-primary)]" />
                      {t.name}
                    </td>
                    <td className="px-6 py-3">{t.quantity}</td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {peso.format(t.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
              <i className="fa-solid fa-mug-saucer text-3xl text-[var(--color-primary-200)]" />
              <p className="mt-2">No items sold in this window.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`cc-card cc-card-hover p-5 ${
        accent ? "border-[var(--color-accent)]" : ""
      }`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-full ${
          accent
            ? "bg-[var(--color-accent)] text-white"
            : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
        }`}
      >
        <i className={`fa-solid ${icon}`} />
      </span>
      <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </p>
      <p className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
