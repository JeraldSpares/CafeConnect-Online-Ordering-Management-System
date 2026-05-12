import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { OrderActions, PaymentForm } from "./order-controls";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
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
          "id, order_number, status, order_type, subtotal, discount, total, notes, created_at, completed_at, customers ( id, full_name, phone, email )",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("order_items")
        .select("id, item_name, quantity, unit_price, line_total, notes")
        .eq("order_id", id)
        .order("item_name"),
      supabase
        .from("transactions")
        .select("id, payment_method, amount, status, reference_number, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!order) notFound();
  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
  const paidTotal =
    payments
      ?.filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const balance = Number(order.total) - paidTotal;

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
      >
        <i className="fa-solid fa-arrow-left" /> Back to orders
      </Link>

      <header className="cc-card flex flex-wrap items-end justify-between gap-3 p-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
            {order.order_number}
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
            Order details
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Placed {formatDateTime(order.created_at)} ·{" "}
            <span className="font-medium">
              <i
                className={`fa-solid ${order.order_type === "dine_in" ? "fa-chair" : "fa-bag-shopping"}`}
              />{" "}
              {order.order_type === "dine_in" ? "Dine-in" : "Takeaway"}
            </span>
          </p>
        </div>
        <OrderActions
          orderId={order.id}
          status={
            order.status as
              | "pending"
              | "preparing"
              | "ready"
              | "completed"
              | "cancelled"
          }
        />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="cc-card overflow-hidden lg:col-span-2">
          <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-4">
            <i className="fa-solid fa-list text-[var(--color-primary)]" />
            <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
              Items
            </h2>
          </header>
          <ul className="divide-y divide-[var(--color-line)]" data-stagger>
            {items?.map((it) => (
              <li key={it.id} className="flex items-start gap-4 px-6 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                  <i className="fa-solid fa-mug-saucer" />
                </span>
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-primary)]">
                    {it.item_name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {it.quantity} × {peso.format(Number(it.unit_price))}
                  </p>
                  {it.notes && (
                    <p className="mt-1 text-xs italic text-[var(--color-muted)]">
                      <i className="fa-solid fa-quote-left mr-1" />
                      {it.notes}
                    </p>
                  )}
                </div>
                <span className="font-display font-bold text-[var(--color-primary)]">
                  {peso.format(Number(it.line_total))}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-line)] px-6 py-4 text-sm">
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>Subtotal</span>
              <span>{peso.format(Number(order.subtotal))}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="mt-1 flex justify-between text-[var(--color-muted)]">
                <span>Discount</span>
                <span>− {peso.format(Number(order.discount))}</span>
              </div>
            )}
            <div className="mt-3 flex items-end justify-between border-t border-[var(--color-line)] pt-3">
              <span className="font-semibold text-[var(--color-primary)]">
                Total
              </span>
              <span className="font-display text-2xl font-bold text-[var(--color-primary)]">
                {peso.format(Number(order.total))}
              </span>
            </div>
          </div>
          {order.notes && (
            <div className="border-t border-[var(--color-line)] bg-[var(--color-accent-50)]/40 px-6 py-3 text-sm">
              <span className="font-semibold text-[var(--color-primary)]">
                <i className="fa-solid fa-pen mr-1" /> Customer notes:
              </span>{" "}
              <span className="text-[var(--color-muted)]">{order.notes}</span>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="cc-card p-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <i className="fa-solid fa-user" /> Customer
            </h3>
            <p className="mt-2 font-display text-lg font-semibold text-[var(--color-primary)]">
              {customer?.full_name ?? "Walk-in"}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              <i className="fa-solid fa-phone mr-1" /> {customer?.phone ?? "—"}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              <i className="fa-solid fa-envelope mr-1" />{" "}
              {customer?.email ?? "—"}
            </p>
          </div>

          <div className="cc-card p-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <i className="fa-solid fa-credit-card" /> Payment
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-[var(--color-primary-50)] p-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  Paid
                </p>
                <p className="font-display text-lg font-bold text-[var(--color-primary)]">
                  {peso.format(paidTotal)}
                </p>
              </div>
              <div
                className={`rounded-lg p-2 ${balance <= 0 ? "bg-[var(--color-success-bg)]" : "bg-[var(--color-accent-50)]"}`}
              >
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  Balance
                </p>
                <p
                  className={`font-display text-lg font-bold ${balance <= 0 ? "text-[var(--color-success)]" : "text-[var(--color-accent)]"}`}
                >
                  {peso.format(balance)}
                </p>
              </div>
            </div>

            {payments && payments.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-line)] px-2 py-1.5"
                  >
                    <span className="flex items-center gap-1 capitalize">
                      <i
                        className={`fa-solid ${
                          p.payment_method === "cash"
                            ? "fa-money-bills"
                            : p.payment_method === "card"
                              ? "fa-credit-card"
                              : "fa-mobile-screen-button"
                        } text-[var(--color-primary)]`}
                      />
                      {p.payment_method}
                      <span
                        className={
                          p.status === "paid"
                            ? "text-[var(--color-success)]"
                            : p.status === "refunded"
                              ? "text-[var(--color-danger)]"
                              : "text-[var(--color-accent)]"
                        }
                      >
                        · {p.status}
                      </span>
                    </span>
                    <span className="font-semibold">
                      {peso.format(Number(p.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {balance > 0 && order.status !== "cancelled" && (
              <PaymentForm orderId={order.id} suggestedAmount={balance} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
