"use server";

import { createClient } from "@/lib/supabase/server";

export type PlaceOrderInput = {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  order_type: "dine_in" | "takeaway";
  notes?: string;
  items: { menu_item_id: string; quantity: number; notes?: string }[];
};

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
  return { error: null, orderNumber: row.out_order_number as string };
}
