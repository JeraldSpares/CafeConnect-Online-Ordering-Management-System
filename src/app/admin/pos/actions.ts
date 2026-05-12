"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PosOrderInput = {
  customer_name: string;
  customer_phone?: string;
  order_type: "dine_in" | "takeaway";
  notes?: string;
  items: { menu_item_id: string; quantity: number }[];
  payment?: {
    method: "cash" | "gcash" | "maya" | "card";
    amount: number;
    reference?: string;
  };
};

export async function posCreateOrder(input: PosOrderInput) {
  if (!input.customer_name?.trim()) {
    return { error: "Customer name (or 'Walk-in') is required." };
  }
  if (!input.items?.length) return { error: "Add at least one item." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_customer_name: input.customer_name,
    p_customer_phone: input.customer_phone ?? "",
    p_customer_email: "",
    p_order_type: input.order_type,
    p_notes: input.notes ?? "",
    p_items: input.items as never,
  });

  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.out_order_id) {
    return { error: "Could not create order." };
  }

  const orderId = row.out_order_id as string;
  const orderNumber = row.out_order_number as string;

  if (input.payment) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: payErr } = await supabase.from("transactions").insert({
      order_id: orderId,
      payment_method: input.payment.method,
      amount: input.payment.amount,
      status: "paid",
      reference_number: input.payment.reference || null,
      processed_by: user?.id ?? null,
    });
    if (payErr) {
      return {
        error: `Order created but payment failed: ${payErr.message}`,
        orderId,
        orderNumber,
      };
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");

  return { error: null, orderId, orderNumber };
}
