import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

export default async function KitchenTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/kitchen-ticket/${id}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "customer") redirect("/");

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, status, order_type, notes, created_at, customers ( full_name )",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("order_items")
      .select("item_name, quantity, notes")
      .eq("order_id", id)
      .order("item_name"),
  ]);

  if (!order) notFound();
  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;

  return (
    <>
      <style>{`
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .ticket { box-shadow: none !important; border: none !important; }
        }
        @page { size: 80mm auto; margin: 4mm; }
      `}</style>
      <div className="min-h-screen bg-[var(--color-bg)] py-8">
        <div className="no-print mx-auto mb-4 flex w-full max-w-sm items-center justify-between px-4">
          <Link
            href={`/admin/orders/${id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-arrow-left" /> Back
          </Link>
          <PrintTrigger />
        </div>

        <article
          className="ticket mx-auto w-full max-w-sm rounded-xl bg-white p-5 font-mono shadow-md"
          style={{ fontFamily: "ui-monospace, 'Cascadia Mono', Menlo, monospace" }}
        >
          <header className="text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Kitchen Ticket
            </p>
            <h1 className="mt-1 font-mono text-2xl font-bold tracking-[0.18em] text-[var(--color-primary)]">
              {order.order_number}
            </h1>
          </header>

          <div
            className="my-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(to right, var(--color-line) 0 6px, transparent 6px 10px)",
            }}
          />

          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Time</dt>
              <dd>{formatDateTime(order.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Type</dt>
              <dd className="uppercase">
                {order.order_type === "dine_in" ? "DINE-IN" : "TAKEAWAY"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Customer</dt>
              <dd className="font-bold">{customer?.full_name ?? "Walk-in"}</dd>
            </div>
          </dl>

          <div
            className="my-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(to right, var(--color-line) 0 6px, transparent 6px 10px)",
            }}
          />

          <p className="mb-2 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Items
          </p>
          <ul className="space-y-2">
            {items?.map((it, i) => (
              <li key={i} className="border-l-4 border-l-[var(--color-primary)] pl-2">
                <p className="text-base">
                  <span className="font-bold text-[var(--color-primary)]">
                    {it.quantity}×
                  </span>{" "}
                  <span className="font-bold">{it.item_name}</span>
                </p>
                {it.notes && (
                  <p className="mt-0.5 rounded bg-[var(--color-accent-50)] px-2 py-1 text-[11px] italic text-[var(--color-accent)]">
                    📝 {it.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {order.notes && (
            <>
              <div
                className="my-3 h-px"
                style={{
                  background:
                    "repeating-linear-gradient(to right, var(--color-line) 0 6px, transparent 6px 10px)",
                }}
              />
              <p className="rounded bg-[var(--color-accent-50)] px-3 py-2 text-xs text-[var(--color-accent)]">
                <strong>Customer note:</strong> {order.notes}
              </p>
            </>
          )}

          <div
            className="my-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(to right, var(--color-line) 0 6px, transparent 6px 10px)",
            }}
          />

          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]">
            ── Hand to barista ──
          </p>
        </article>
      </div>
    </>
  );
}
