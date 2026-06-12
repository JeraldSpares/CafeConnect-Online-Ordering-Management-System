"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PosPaymentSplit = {
  method: "cash" | "gcash" | "maya" | "card";
  amount: number;
  reference?: string;
};

export type PosOrderInput = {
  customer_name: string;
  customer_phone?: string;
  order_type: "dine_in" | "takeaway";
  table_label?: string;
  notes?: string;
  items: { menu_item_id: string; quantity: number; notes?: string }[];
  // Only the code is trusted from the client — the amount and the
  // discounts.id row are re-resolved on the server so a tampered
  // client can't bolt a fake 100%-off code onto the order.
  discount?: { code: string };
  // Multiple payment splits — empty array means "don't collect now".
  payments?: PosPaymentSplit[];
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

  // Stamp the table label if this was a dine-in order.
  if (input.order_type === "dine_in" && input.table_label?.trim()) {
    await supabase
      .from("orders")
      .update({ table_label: input.table_label.trim() })
      .eq("id", orderId);
  }

  // Re-read the server-side subtotal to defend against client tampering,
  // then re-run apply_discount server-side. We ignore any amount/id the
  // client passed — the only field we trust from input.discount is the
  // code, and even that we re-validate via the RPC.
  let finalTotal = 0;
  {
    const { data: ord } = await supabase
      .from("orders")
      .select("subtotal")
      .eq("id", orderId)
      .single();
    const realSubtotal = Number(ord?.subtotal ?? 0);
    finalTotal = realSubtotal;

    const code = input.discount?.code?.trim();
    if (code && realSubtotal > 0) {
      const { data: amt, error: discErr } = await supabase.rpc(
        "apply_discount",
        { p_code: code, p_subtotal: realSubtotal },
      );
      const serverAmount = discErr ? 0 : Number(amt ?? 0);

      if (serverAmount > 0) {
        // Look up the canonical discount row server-side so the order's
        // discount_id is pinned to a row we actually verified.
        const { data: discRow } = await supabase
          .from("discounts")
          .select("id, code")
          .ilike("code", code)
          .maybeSingle();

        const safeDiscount = Math.min(serverAmount, realSubtotal);
        finalTotal = realSubtotal - safeDiscount;
        await supabase
          .from("orders")
          .update({
            discount: safeDiscount,
            discount_code: discRow?.code ?? code,
            discount_id: discRow?.id ?? null,
            total: finalTotal,
          })
          .eq("id", orderId);
      }
      // If serverAmount is 0 we silently drop the discount — the client
      // got a stale code (expired, used up, fell below min_order_total
      // after the cart shrank, etc.). The order still goes through at
      // full price; that's the safer of the two failure modes.
    }
  }

  if (input.payments && input.payments.length > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Cap the total of all splits at finalTotal so client manipulation
    // can't push a "paid" total above what the order actually costs.
    let allocated = 0;
    const rows = input.payments
      .filter((p) => p.amount > 0)
      .map((p) => {
        const remaining = Math.max(0, finalTotal - allocated);
        const amt = Math.min(p.amount, remaining);
        allocated += amt;
        return {
          order_id: orderId,
          payment_method: p.method,
          amount: amt,
          status: "paid",
          reference_number: p.reference || null,
          processed_by: user?.id ?? null,
        };
      })
      .filter((r) => r.amount > 0);

    if (rows.length > 0) {
      const { error: payErr } = await supabase.from("transactions").insert(rows);
      if (payErr) {
        return {
          error: `Order created but payment failed: ${payErr.message}`,
          orderId,
          orderNumber,
        };
      }
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
// lookupCustomerByPhone — combined autosuggest + loyalty status.
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
