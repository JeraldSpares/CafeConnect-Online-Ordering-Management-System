import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { DiscountTools, DiscountRow } from "./discount-tools";

export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  const supabase = await createClient();
  const { data: discounts } = await supabase
    .from("discounts")
    .select(
      "id, code, description, kind, amount, min_order_total, max_uses, uses_count, expires_at, is_active, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-tags" /> Promotions
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Discount codes
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Customers enter the code at checkout. Each code can be a percent
          (e.g. 10%) or a fixed peso amount.
        </p>
      </header>

      <DiscountTools />

      <section className="cc-card overflow-hidden">
        <header className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-ticket" /> Active codes
          </h2>
        </header>
        {discounts && discounts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Discount</th>
                <th className="px-6 py-3">Min order</th>
                <th className="px-6 py-3">Used / max</th>
                <th className="px-6 py-3">Expires</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-[var(--color-line)]"
                >
                  <td className="px-6 py-3 font-mono font-bold text-[var(--color-primary)]">
                    {d.code}
                    {d.description && (
                      <p className="font-sans text-xs font-normal text-[var(--color-muted)]">
                        {d.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 font-semibold">
                    {d.kind === "percent"
                      ? `${Number(d.amount)}%`
                      : peso.format(Number(d.amount))}
                  </td>
                  <td className="px-6 py-3 text-[var(--color-muted)]">
                    {Number(d.min_order_total) > 0
                      ? peso.format(Number(d.min_order_total))
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-[var(--color-muted)]">
                    {d.uses_count} / {d.max_uses ?? "∞"}
                  </td>
                  <td className="px-6 py-3 text-[var(--color-muted)]">
                    {d.expires_at ? formatDateTime(d.expires_at) : "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`chip ${d.is_active ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-line)] text-[var(--color-muted)]"}`}
                    >
                      {d.is_active ? "active" : "paused"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <DiscountRowActions
                      id={d.id}
                      code={d.code}
                      isActive={d.is_active}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center">
            <i className="fa-solid fa-ticket text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No discount codes yet. Create your first one above.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DiscountRowActions({
  id,
  code,
  isActive,
}: {
  id: string;
  code: string;
  isActive: boolean;
}) {
  return <DiscountRow id={id} code={code} isActive={isActive} />;
}
