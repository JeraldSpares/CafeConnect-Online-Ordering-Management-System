import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mock PayMongo handler.
 *
 * In production this endpoint would:
 *   1. Receive {order_number, method}
 *   2. Look up the order's outstanding balance
 *   3. POST /v1/checkout_sessions to PayMongo with that amount
 *   4. Return the checkout_url for the client to redirect into
 *   5. A separate webhook endpoint (/api/pay/webhook) would handle the
 *      payment.paid event and insert into public.transactions.
 *
 * For the capstone demo we shortcut the whole loop: we record the
 * transaction immediately as "paid" so the UX feels real. To go live,
 * swap the body of POST below for the PayMongo calls and add a
 * webhook handler.
 */
export async function POST(req: Request) {
  let body: { order_number?: string; method?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const orderNumber = body.order_number?.trim();
  const method = body.method;
  if (!orderNumber || !method)
    return NextResponse.json(
      { error: "order_number and method are required" },
      { status: 400 },
    );
  if (!["gcash", "maya", "card"].includes(method))
    return NextResponse.json(
      { error: "unsupported method (must be gcash, maya, or card)" },
      { status: 400 },
    );

  const supabase = await createClient();

  // Look up the order
  const { data: order, error: lookupErr } = await supabase
    .from("orders")
    .select("id, total")
    .eq("order_number", orderNumber)
    .single();
  if (lookupErr || !order)
    return NextResponse.json({ error: "order not found" }, { status: 404 });

  // Sum paid transactions to compute the balance
  const { data: existing } = await supabase
    .from("transactions")
    .select("amount, status")
    .eq("order_id", order.id);
  const paid =
    existing
      ?.filter((t) => t.status === "paid")
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const balance = Number(order.total) - paid;
  if (balance <= 0)
    return NextResponse.json(
      { error: "this order is already paid" },
      { status: 409 },
    );

  const reference = `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const { error: insertErr } = await supabase.from("transactions").insert({
    order_id: order.id,
    payment_method: method,
    amount: balance,
    status: "paid",
    reference_number: reference,
  });
  if (insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    method,
    amount: balance,
    reference,
    note: "Demo flow — replace with PayMongo Checkout Sessions to go live.",
  });
}
