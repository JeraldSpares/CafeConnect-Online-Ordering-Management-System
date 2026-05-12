import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type CustomerWithStats = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select(
      "id, full_name, phone, email, created_at, orders ( total, status, created_at )",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }

  const { data: customers } = await query;

  const rows: CustomerWithStats[] = (customers ?? []).map((c) => {
    const orders = Array.isArray(c.orders) ? c.orders : [];
    const valid = orders.filter((o) => o.status !== "cancelled");
    const total_spent = valid.reduce((s, o) => s + Number(o.total), 0);
    const last_order_at =
      valid.length > 0
        ? valid
            .map((o) => o.created_at)
            .sort()
            .at(-1) ?? null
        : null;
    return {
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      created_at: c.created_at,
      order_count: valid.length,
      total_spent,
      last_order_at,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.orders += r.order_count;
      acc.spent += r.total_spent;
      return acc;
    },
    { orders: 0, spent: 0 },
  );

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-users" /> CRM
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Customers
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Every order creates a customer record. Search by name, phone, or
          email.
        </p>
      </header>

      <form
        action="/admin/customers"
        method="get"
        className="cc-card flex flex-wrap items-center gap-2 p-4"
      >
        <div className="relative flex-1 min-w-48">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, phone, or email…"
            className="cc-input !pl-10"
          />
        </div>
        <button type="submit" className="btn-primary">
          <i className="fa-solid fa-magnifying-glass" /> Search
        </button>
        {q && (
          <a
            href="/admin/customers"
            className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-xmark" /> Clear
          </a>
        )}
      </form>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon="fa-users" label="Records" value={String(rows.length)} />
        <Stat
          icon="fa-receipt"
          label="Total orders"
          value={String(totals.orders)}
        />
        <Stat
          icon="fa-peso-sign"
          label="Total spent"
          value={peso.format(totals.spent)}
        />
      </section>

      <section className="cc-card overflow-hidden">
        {rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Orders</th>
                <th className="px-6 py-3">Total Spent</th>
                <th className="px-6 py-3">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-[var(--color-line)] transition-colors hover:bg-[var(--color-primary-50)]/40"
                >
                  <td className="px-6 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary)] text-white">
                        <i className="fa-solid fa-user text-xs" />
                      </span>
                      {c.full_name}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[var(--color-muted)]">
                    {c.phone ? (
                      <>
                        <i className="fa-solid fa-phone mr-1" /> {c.phone}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3 text-[var(--color-muted)]">
                    {c.email ? (
                      <>
                        <i className="fa-solid fa-envelope mr-1" /> {c.email}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className="chip bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                      {c.order_count}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-semibold">
                    {peso.format(c.total_spent)}
                  </td>
                  <td className="px-6 py-3 text-[var(--color-muted)]">
                    {c.last_order_at ? formatDateTime(c.last_order_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <i className="fa-solid fa-user-group text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {q
                ? `No customers match "${q}".`
                : "No customer records yet. They'll appear after the first order."}
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
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="cc-card cc-card-hover p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
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
