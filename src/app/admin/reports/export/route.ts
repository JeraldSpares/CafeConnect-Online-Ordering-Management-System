import { createClient } from "@/lib/supabase/server";

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 7, 1), 365);

  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "order_number, status, order_type, subtotal, discount, total, notes, created_at, completed_at, customers ( full_name, phone, email ), transactions ( payment_method, amount, status, reference_number )",
    )
    .gte("created_at", from.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(`Failed: ${error.message}`, { status: 500 });
  }

  const header = [
    "order_number",
    "status",
    "order_type",
    "created_at",
    "completed_at",
    "customer_name",
    "customer_phone",
    "customer_email",
    "subtotal",
    "discount",
    "total",
    "payment_method",
    "payment_status",
    "payment_reference",
    "notes",
  ];

  const rows = (orders ?? []).map((o) => {
    const c = Array.isArray(o.customers) ? o.customers[0] : o.customers;
    const txs = Array.isArray(o.transactions) ? o.transactions : [];
    const lastPaid = txs.find((t) => t.status === "paid") ?? txs.at(-1);
    return [
      o.order_number,
      o.status,
      o.order_type,
      o.created_at,
      o.completed_at ?? "",
      c?.full_name ?? "",
      c?.phone ?? "",
      c?.email ?? "",
      o.subtotal,
      o.discount,
      o.total,
      lastPaid?.payment_method ?? "",
      lastPaid?.status ?? "",
      lastPaid?.reference_number ?? "",
      o.notes ?? "",
    ];
  });

  const csv = [header, ...rows]
    .map((r) => r.map(escape).join(","))
    .join("\n");

  const fileName = `cafeconnect-sales-${days}d-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
