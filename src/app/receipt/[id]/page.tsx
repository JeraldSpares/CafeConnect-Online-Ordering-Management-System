import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, formatDateTime } from "@/lib/format";
import { BrandLogo } from "@/components/brand-logo";
import { loadSettings } from "@/lib/app-settings";
import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check (staff only) — receipts contain customer + payment info.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/receipt/${id}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "customer") redirect("/");

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
  const balance = Number(order.total) - paid;

  const settings = await loadSettings();
  // VAT breakdown — total is treated as VAT-inclusive (Philippine standard).
  // Net = total / (1 + rate); VAT = total - net.
  const total = Number(order.total);
  const vatRate = settings.vat_rate || 0.12;
  const netSales = total > 0 ? total / (1 + vatRate) : 0;
  const vatAmount = total - netSales;

  return (
    <>
      <style>{`
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .receipt-page { padding: 0 !important; }
          .receipt-card { box-shadow: none !important; border: none !important; }
        }
        @page { size: 80mm auto; margin: 6mm; }
      `}</style>

      <div className="receipt-page min-h-screen bg-[var(--color-bg)] py-8">
        {/* Top toolbar — hidden on print */}
        <div className="no-print mx-auto mb-4 flex w-full max-w-md items-center justify-between px-4">
          <Link
            href={`/admin/orders/${id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-arrow-left" /> Back to order
          </Link>
          <PrintTrigger />
        </div>

        {/* The receipt itself */}
        <article
          className="receipt-card mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgba(20,39,31,0.18)]"
          style={{ fontFamily: "ui-monospace, 'Cascadia Mono', Menlo, monospace" }}
        >
          {/* Branded header band */}
          <header className="relative bg-[var(--color-primary)] px-6 pb-6 pt-7 text-center text-white">
            <div className="mx-auto inline-block">
              <BrandLogo size={64} />
            </div>
            <p
              className="mt-2 text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {settings.business_name}
            </p>
            <h1
              className="mt-0.5 text-lg font-bold"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Official Receipt
            </h1>
            <p className="mt-1 text-[9px] tracking-wider text-white/70">
              {settings.business_address}
            </p>
            <p className="text-[9px] tracking-wider text-white/70">
              TIN: {settings.business_tin}
            </p>
            {/* Notched edge under header */}
            <div className="absolute inset-x-0 bottom-0 h-3 translate-y-1/2">
              <div className="relative h-full bg-white">
                <div
                  className="absolute inset-y-0 left-0 right-0"
                  style={{
                    background: "var(--color-primary)",
                    maskImage:
                      "radial-gradient(circle 6px at 6px 50%, transparent 98%, black 100%)",
                    maskSize: "12px 100%",
                    maskRepeat: "repeat-x",
                  }}
                />
              </div>
            </div>
          </header>

          <div className="px-7 pt-6 pb-5 text-sm">
            {/* Order metadata */}
            <dl className="space-y-1 text-xs">
              <Row label="Order #">
                <span className="font-bold tracking-[0.15em] text-[var(--color-primary)]">
                  {order.order_number}
                </span>
              </Row>
              <Row label="Date">{formatDateTime(order.created_at)}</Row>
              <Row label="Type">
                <span className="inline-flex items-center gap-1 capitalize">
                  <i
                    className={`fa-solid ${
                      order.order_type === "dine_in"
                        ? "fa-chair"
                        : "fa-bag-shopping"
                    }`}
                  />
                  {order.order_type.replace("_", "-")}
                </span>
              </Row>
              <Row label="Customer">{customer?.full_name ?? "Walk-in"}</Row>
              {customer?.phone && <Row label="Phone">{customer.phone}</Row>}
            </dl>

            <Divider />

            {/* Items */}
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Items
            </p>
            <ul className="space-y-1.5">
              {items?.map((it, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="text-[var(--color-text)]">
                      <span className="font-semibold text-[var(--color-primary)]">
                        {it.quantity}×
                      </span>{" "}
                      {it.item_name}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted)]">
                      @ {peso.format(Number(it.unit_price))}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-[var(--color-text)]">
                    {peso.format(Number(it.line_total))}
                  </span>
                </li>
              ))}
            </ul>

            <Divider />

            {/* Totals + VAT breakdown */}
            <dl className="space-y-1 text-xs">
              <Row label="Subtotal">{peso.format(Number(order.subtotal))}</Row>
              {Number(order.discount) > 0 && (
                <Row label="Discount" valueClassName="text-[var(--color-danger)]">
                  − {peso.format(Number(order.discount))}
                </Row>
              )}
              <Row label={`VATable Sales`}>
                {peso.format(netSales)}
              </Row>
              <Row label={`VAT (${Math.round(vatRate * 100)}%)`}>
                {peso.format(vatAmount)}
              </Row>
            </dl>

            <div className="mt-3 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-white shadow-sm">
              <div className="flex items-end justify-between">
                <span
                  className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-accent)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Total Due
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {peso.format(Number(order.total))}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2 text-[10px]">
                <span className="text-white/70">Paid</span>
                <span className="text-[var(--color-accent)]">
                  {peso.format(paid)}
                </span>
              </div>
              {balance > 0 && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/70">Balance</span>
                  <span className="text-white">{peso.format(balance)}</span>
                </div>
              )}
            </div>

            {/* Payments */}
            {payments && payments.length > 0 && (
              <>
                <Divider />
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  Payments
                </p>
                <ul className="space-y-1 text-xs">
                  {payments.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="inline-flex items-center gap-1.5 capitalize">
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
                        {p.reference_number && (
                          <span className="ml-1 text-[10px] text-[var(--color-muted)]">
                            #{p.reference_number}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">
                        {peso.format(Number(p.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <Divider />

            <footer className="text-center text-[11px] leading-relaxed text-[var(--color-muted)]">
              <p className="font-semibold text-[var(--color-primary)]">
                Thank you for choosing Hebrews Kape! ☕
              </p>
              <p className="mt-0.5">
                Track your order at <strong>/track</strong>
              </p>
              <p className="mt-3 text-[9px] tracking-[0.3em] text-[var(--color-accent)]">
                ─ POWERED BY CAFECONNECT ─
              </p>
            </footer>
          </div>
        </article>
      </div>
    </>
  );
}

function Divider() {
  return (
    <div
      className="my-3 h-px"
      style={{
        background:
          "repeating-linear-gradient(to right, var(--color-line) 0 6px, transparent 6px 10px)",
      }}
    />
  );
}

function Row({
  label,
  children,
  valueClassName = "",
}: {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className={`text-right text-[var(--color-text)] ${valueClassName}`}>
        {children}
      </dd>
    </div>
  );
}
