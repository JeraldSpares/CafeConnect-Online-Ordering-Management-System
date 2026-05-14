"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  sendNewOrderToAdmin,
  sendOrderPlacedToCustomer,
} from "@/lib/email";

export type PlaceOrderInput = {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  order_type: "dine_in" | "takeaway";
  notes?: string;
  items: { menu_item_id: string; quantity: number; notes?: string }[];
  discount_code?: string;
};

export async function previewDiscount(code: string, subtotal: number) {
  if (!code?.trim()) return { discount: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_discount", {
    p_code: code,
    p_subtotal: subtotal,
  });
  if (error) return { error: error.message };
  return { discount: Number(data ?? 0) };
}

export async function placeOrderAction(input: PlaceOrderInput) {
  if (!input.customer_name?.trim()) {
    return { error: "Please enter your name." };
  }
  if (!input.items || input.items.length === 0) {
    return { error: "Your cart is empty." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_customer_name: input.customer_name,
    p_customer_phone: input.customer_phone ?? "",
    p_customer_email: input.customer_email ?? "",
    p_order_type: input.order_type,
    p_notes: input.notes ?? "",
    p_items: input.items as never,
  });

  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.out_order_number) {
    return { error: "Order could not be placed. Please try again." };
  }

  const orderNumber = row.out_order_number as string;
  const orderId = row.out_order_id as string;

  // Apply discount if one was provided. Done after place_order to keep the
  // RPC simple — we validate via the apply_discount RPC, then adjust the
  // order row.
  if (input.discount_code?.trim()) {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("subtotal")
      .eq("id", orderId)
      .single();
    if (orderRow) {
      const { data: discValue } = await supabase.rpc("apply_discount", {
        p_code: input.discount_code,
        p_subtotal: Number(orderRow.subtotal),
      });
      const discount = Number(discValue ?? 0);
      if (discount > 0) {
        const { data: matched } = await supabase
          .from("discounts")
          .select("id")
          .ilike("code", input.discount_code.trim())
          .limit(1)
          .maybeSingle();
        await supabase
          .from("orders")
          .update({
            discount,
            total: Number(orderRow.subtotal) - discount,
            discount_code: input.discount_code.toUpperCase(),
            discount_id: matched?.id ?? null,
          })
          .eq("id", orderId);
        // increment uses
        if (matched?.id) {
          const { data: cur } = await supabase
            .from("discounts")
            .select("uses_count")
            .eq("id", matched.id)
            .single();
          if (cur) {
            await supabase
              .from("discounts")
              .update({ uses_count: cur.uses_count + 1 })
              .eq("id", matched.id);
          }
        }
      }
    }
  }

  // Fire-and-forget emails — never block the checkout response on them.
  void sendOrderNotifications(supabase, orderId).catch((e) =>
    console.error("[order notif]", e),
  );

  return { error: null, orderNumber };
}

async function sendOrderNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
) {
  const { data: order } = await supabase
    .from("orders")
    .select(
      "order_number, order_type, subtotal, discount, total, notes, customers ( full_name, email, phone )",
    )
    .eq("id", orderId)
    .single();

  if (!order) return;

  const { data: items } = await supabase
    .from("order_items")
    .select("item_name, quantity, unit_price, line_total")
    .eq("order_id", orderId)
    .order("item_name");

  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const trackUrl = `${proto}://${host}/order/${order.order_number}`;

  const ctx = {
    orderNumber: order.order_number,
    customerName: customer?.full_name ?? "Customer",
    customerEmail: customer?.email ?? null,
    customerPhone: customer?.phone ?? null,
    orderType: order.order_type as "dine_in" | "takeaway",
    items: (items ?? []).map((it) => ({
      item_name: it.item_name,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      line_total: Number(it.line_total),
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    notes: order.notes,
    trackUrl,
  };

  await Promise.allSettled([
    sendOrderPlacedToCustomer(ctx),
    sendNewOrderToAdmin(ctx),
  ]);
}
