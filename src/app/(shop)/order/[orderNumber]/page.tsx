import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";

type OrderPayload = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  customer: { full_name: string; phone: string | null; email: string | null };
  items: {
    item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    notes: string | null;
  }[];
  payment: {
    method: string;
    status: string;
    amount: number;
    reference_number: string | null;
  } | null;
};

const STATUS_STEPS: { key: string; label: string; icon: string }[] = [
  { key: "pending",    label: "Order placed",      icon: "fa-receipt" },
  { key: "preparing",  label: "Preparing",         icon: "fa-mug-hot" },
  { key: "ready",      label: "Ready for pickup",  icon: "fa-bell" },
  { key: "completed",  label: "Completed",         icon: "fa-circle-check" },
];

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_order_by_number", {
    p_order_number: orderNumber,
  });

  if (error || !data) notFound();
  const order = data as unknown as OrderPayload;
  if (!order || !order.order_number) notFound();

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  const progressPct =
    currentIndex < 0
      ? 0
      : Math.max(0, Math.min(100, (currentIndex / (STATUS_STEPS.length - 1)) * 100));

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero */}
      <section className="cc-card relative overflow-hidden p-8 sm:p-10">
        <div className="cc-bean" style={{ width: 240, height: 160, top: -60, right: -40 }} />
        <span className="chip bg-[var(--color-accent-50)] text-[var(--color-accent)]">
          <i className="fa-solid fa-receipt" /> Your Order
        </span>
        <h1 className="font-display mt-3 font-mono text-3xl font-bold tracking-wider text-[var(--color-primary)] sm:text-4xl">
          {order.order_number}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Placed {formatDateTime(order.created_at)} ·{" "}
          <span className="font-medium">
            {order.order_type === "dine_in" ? (
              <>
                <i className="fa-solid fa-chair" /> Dine-in
              </>
            ) : (
              <>
                <i className="fa-solid fa-bag-shopping" /> Takeaway
              </>
            )}
          </span>
        </p>

        {isCancelled ? (
          <div className="mt-6 rounded-xl border-l-4 border-l-[var(--color-danger)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger)]">
            <i className="fa-solid fa-circle-xmark mr-1" /> This order was
            cancelled.
          </div>
        ) : (
          <div className="mt-8">
            {/* Progress bar */}
            <div className="relative h-1.5 rounded-full bg-[var(--color-line)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)] animate-progress"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Steps */}
            <ol className="mt-6 grid grid-cols-4 gap-2">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentIndex;
                const current = i === currentIndex;
                return (
                  <li
                    key={step.key}
                    className="flex flex-col items-center text-center"
                  >
                    <span
                      className={`relative grid h-12 w-12 place-items-center rounded-full border-2 transition-all ${
                        done
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                      } ${current ? "animate-pulse-ring" : ""}`}
                    >
                      <i className={`fa-solid ${step.icon}`} />
                    </span>
                    <span
                      className={`mt-2 text-[11px] font-semibold uppercase tracking-wider ${
                        done
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-muted)]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {order.payment && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="chip bg-[var(--color-primary-50)] text-[var(--color-primary)]">
              <i className="fa-solid fa-credit-card" /> {order.payment.method}
            </span>
            <span
              className={`chip ${
                order.payment.status === "paid"
                  ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                  : "bg-[var(--color-accent-50)] text-[var(--color-accent)]"
              }`}
            >
              <i
                className={`fa-solid ${
                  order.payment.status === "paid"
                    ? "fa-circle-check"
                    : "fa-clock"
                }`}
              />{" "}
              {order.payment.status}
            </span>
          </div>
        )}
      </section>

      {/* Items */}
      <section className="cc-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-list mr-2" /> Items
          </h2>
          <span className="text-xs text-[var(--color-muted)]">
            {order.items.length} item{order.items.length === 1 ? "" : "s"}
          </span>
        </header>
        <ul className="divide-y divide-[var(--color-line)]" data-stagger>
          {order.items.map((it, idx) => (
            <li key={idx} className="flex items-center gap-4 px-6 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                <i className="fa-solid fa-mug-saucer" />
              </span>
              <div className="flex-1">
                <p className="font-medium text-[var(--color-primary)]">
                  {it.item_name}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {it.quantity} × {peso.format(Number(it.unit_price))}
                </p>
              </div>
              <span className="font-display font-bold text-[var(--color-primary)]">
                {peso.format(Number(it.line_total))}
              </span>
            </li>
          ))}
        </ul>
        <footer className="flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-primary-50)] px-6 py-4">
          <span className="font-semibold text-[var(--color-primary)]">
            Total
          </span>
          <span className="font-display text-2xl font-bold text-[var(--color-primary)]">
            {peso.format(Number(order.total))}
          </span>
        </footer>
      </section>

      {order.payment?.status !== "paid" && !isCancelled && (
        <Link
          href={`/pay/${order.order_number}`}
          className="btn-primary w-full !py-3 text-base"
        >
          <i className="fa-solid fa-credit-card" /> Pay online ·{" "}
          {peso.format(Number(order.total))}
        </Link>
      )}

      <div className="flex justify-between">
        <Link href="/menu" className="btn-ghost">
          <i className="fa-solid fa-rotate-right" /> Order again
        </Link>
        <Link
          href="/track"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
        >
          Track another order <i className="fa-solid fa-arrow-right" />
        </Link>
      </div>
    </div>
  );
}
