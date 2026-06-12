"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PosOrderInput = {
  customer_name: string;
  customer_phone?: string;
  order_type: "dine_in" | "takeaway";
  notes?: string;
  items: { menu_item_id: string; quantity: number; notes?: string }[];
  discount?: {
    code: string;
    amount: number;
    id: string | null;
  };
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

  // Re-read the server-side subtotal to defend against client tampering,
  // then apply the discount on top of it.
  let finalTotal = 0;
  {
    const { data: ord } = await supabase
      .from("orders")
      .select("subtotal")
      .eq("id", orderId)
      .single();
    const realSubtotal = Number(ord?.subtotal ?? 0);
    finalTotal = realSubtotal;

    if (input.discount && input.discount.amount > 0) {
      const safeDiscount = Math.min(
        Math.max(0, input.discount.amount),
        realSubtotal,
      );
      finalTotal = realSubtotal - safeDiscount;
      await supabase
        .from("orders")
        .update({
          discount: safeDiscount,
          discount_code: input.discount.code,
          discount_id: input.discount.id,
          total: finalTotal,
        })
        .eq("id", orderId);
    }
  }

  if (input.payment) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Always charge the server-computed total, not whatever the client passed.
    const { error: payErr } = await supabase.from("transactions").insert({
      order_id: orderId,
      payment_method: input.payment.method,
      amount: finalTotal,
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

// =========================================================================
// applyDiscountAction — validates a code against the active window + rules
// in apply_discount() and returns the calculated peso amount + discount id
// so the order can be linked back to the row that gave the discount.
// =========================================================================
export async function applyDiscountAction(code: string, subtotal: number) {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Enter a code first." };
  if (subtotal <= 0)
    return { ok: false, error: "Add items before applying a code." };

  const supabase = await createClient();
  const { data: amount, error } = await supabase.rpc("apply_discount", {
    p_code: trimmed,
    p_subtotal: subtotal,
  });
  if (error) return { ok: false, error: error.message };

  const amt = Number(amount ?? 0);
  if (amt <= 0)
    return { ok: false, error: "Code invalid, expired, or below the minimum." };

  // Fetch the discount row so we can pin the order to it (audit trail).
  const { data: row } = await supabase
    .from("discounts")
    .select("id, code, description")
    .ilike("code", trimmed)
    .maybeSingle();

  return {
    ok: true,
    amount: amt,
    discountId: row?.id ?? null,
    code: row?.code ?? trimmed,
    description: row?.description ?? null,
  };
}

// =========================================================================
// lookupCustomerByPhone — combined autosuggest + loyalty status. Used to
// pre-fill the customer name and show "🪙 X / 10 stamps" in the POS cart.
// Returns null fields when the phone is short or unknown.
// =========================================================================
export async function lookupCustomerByPhone(phone: string) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 7) return { match: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("customer_loyalty_status", {
    p_phone: phone,
  });
  if (error) return { match: false, error: error.message };

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { match: false };

  return {
    match: true,
    fullName: (row.full_name as string) ?? null,
    paidOrders: Number(row.paid_orders ?? 0),
    nextFreeAt: Number(row.next_free_at ?? 10),
  };
}
