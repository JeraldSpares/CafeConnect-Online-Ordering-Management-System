import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { PrintTrigger } from "./print-trigger";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }, { data: payments }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, status, order_type, subtotal, discount, total, notes, created_at, completed_at, customers ( full_name, phone )",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("order_items")
        .select("item_name, quantity, unit_price, line_total")
        .eq("order_id", id)
        .order("item_name"),
      supabase
        .from("transactions")
        .select("payment_method, amount, status, reference_number, created_at")
        .eq("order_id", id)
        .order("created_at"),
    ]);

  if (!order) notFound();
  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
  const paid =
    payments
      ?.filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .receipt { box-shadow: none !important; border: none !important; }
        }
        @page { margin: 8mm; }
      `}</style>

      <div className="mx-auto max-w-md p-6">
        <div className="no-print mb-4 flex justify-between">
          <a
            href={`/admin/orders/${id}`}
            className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
          >
            <i className="fa-solid fa-arrow-left" /> Back
          </a>
          <PrintTrigger />
        </div>

        <article
          className="receipt cc-card p-6 font-mono text-sm"
          style={{ fontFamily: "ui-monospace, 'Cascadia Mono', Menlo, monospace" }}
        >
          <header className="text-center">
            <div className="mx-auto inline-block">
              <BrandLogo size={72} />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              Official Receipt · CafeConnect
            </p>
          </header>

          <div className="my-3 border-t border-dashed border-[var(--color-line)]" />

          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Order #</dt>
              <dd className="font-bold tracking-wider text-[var(--color-primary)]">
                {order.order_number}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Date</dt>
              <dd>{formatDateTime(order.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Type</dt>
              <dd className="capitalize">
                {order.order_type.replace("_", "-")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Customer</dt>
              <dd>{customer?.full_name ?? "Walk-in"}</dd>
            </div>
            {customer?.phone && (
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Phone</dt>
                <dd>{customer.phone}</dd>
              </div>
            )}
          </dl>

          <div className="my-3 border-t border-dashed border-[var(--color-line)]" />

          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--color-muted)]">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((it, i) => (
                <tr key={i}>
                  <td className="py-0.5">
                    {it.quantity} × {it.item_name}
                  </td>
                  <td className="py-0.5 text-right">
                    {peso.format(Number(it.line_total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-3 border-t border-dashed border-[var(--color-line)]" />

          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{peso.format(Number(order.subtotal))}</dd>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-[var(--color-danger)]">
                <dt>Discount</dt>
                <dd>−{peso.format(Number(order.discount))}</dd>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-dashed border-[var(--color-line)] pt-1 text-base font-bold">
              <dt>TOTAL</dt>
              <dd className="text-[var(--color-primary)]">
                {peso.format(Number(order.total))}
              </dd>
            </div>
            <div className="flex justify-between text-[var(--color-success)]">
              <dt>Paid</dt>
              <dd>{peso.format(paid)}</dd>
            </div>
            {Number(order.total) - paid > 0 && (
              <div className="flex justify-between text-[var(--color-accent)]">
                <dt>Balance</dt>
                <dd>{peso.format(Number(order.total) - paid)}</dd>
              </div>
            )}
          </dl>

          {payments && payments.length > 0 && (
            <>
              <div className="my-3 border-t border-dashed border-[var(--color-line)]" />
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                Payments
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {payments.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="capitalize">
                      {p.payment_method} ·{" "}
                      <span className="text-[var(--color-muted)]">
                        {p.status}
                      </span>
                      {p.reference_number && ` · ${p.reference_number}`}
                    </span>
                    <span>{peso.format(Number(p.amount))}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="my-3 border-t border-dashed border-[var(--color-line)]" />

          <footer className="text-center text-[11px] text-[var(--color-muted)]">
            <p>Thank you for choosing Hebrew&apos;s Cafe!</p>
            <p className="mt-1">Track your order at <strong>/track</strong></p>
            <p className="mt-2 text-[10px] tracking-widest">
              ── CafeConnect ──
            </p>
          </footer>
        </article>
      </div>
    </>
  );
}
