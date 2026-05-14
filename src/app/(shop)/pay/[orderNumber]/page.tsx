import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { PayDemoButton } from "./pay-button";

export const dynamic = "force-dynamic";

type Payload = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  customer: { full_name: string };
};

export default async function PayPage({
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
  const order = data as unknown as Payload;
  if (!order || !order.order_number) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6 animate-fade-up">
      <header className="cc-card p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-credit-card" /> Online Payment
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Pay for order
        </h1>
        <p className="font-mono mt-1 text-sm font-semibold text-[var(--color-primary)]">
          {order.order_number}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Placed {formatDateTime(order.created_at)}
        </p>
      </header>

      <section className="cc-card p-6 text-center">
        <p className="text-sm text-[var(--color-muted)]">Amount due</p>
        <p className="font-display mt-1 text-5xl font-bold text-[var(--color-primary)]">
          {peso.format(Number(order.total))}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          for {order.customer?.full_name ?? "Walk-in"}
        </p>
      </section>

      <section className="cc-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-lock" /> Pay with
        </h2>
        <div className="space-y-2">
          <PayDemoButton
            orderNumber={order.order_number}
            method="gcash"
            label="GCash"
            icon="fa-mobile-screen-button"
          />
          <PayDemoButton
            orderNumber={order.order_number}
            method="maya"
            label="Maya"
            icon="fa-mobile-screen-button"
          />
          <PayDemoButton
            orderNumber={order.order_number}
            method="card"
            label="Credit / Debit Card"
            icon="fa-credit-card"
          />
        </div>
        <div className="mt-4 rounded-xl border-l-4 border-l-[var(--color-accent)] bg-[var(--color-accent-50)] p-3 text-xs text-[var(--color-muted)]">
          <i className="fa-solid fa-circle-info mr-1 text-[var(--color-accent)]" />
          This is a <strong>PayMongo demo</strong> flow for the capstone — no
          real money is moved. To go live, add{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono">
            PAYMONGO_SECRET_KEY
          </code>{" "}
          to <code>.env.local</code>, swap the
          <code className="ml-1 rounded bg-white px-1.5 py-0.5 font-mono">
            POST /api/pay
          </code>{" "}
          handler to call{" "}
          <a
            href="https://developers.paymongo.com/reference/checkout-sessions-resource"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            PayMongo Checkout Sessions
          </a>
          , and register a webhook so the back-end records the payment when
          the customer completes it.
        </div>
      </section>

      <Link
        href={`/order/${order.order_number}`}
        className="block text-center text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <i className="fa-solid fa-arrow-left mr-1" /> Back to order
      </Link>
    </div>
  );
}
