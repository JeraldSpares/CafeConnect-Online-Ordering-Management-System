"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Status = "pending" | "preparing" | "ready" | "completed" | "cancelled";

const NEXT_STATUS: Record<Status, Status | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
  cancelled: null,
};

export async function advanceOrderStatus(orderId: string, current: Status) {
  const next = NEXT_STATUS[current];
  if (!next) return { error: "Order is already finalized." };

  const supabase = await createClient();
  const update: { status: Status; completed_at?: string } = { status: next };
  if (next === "completed") update.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function cancelOrder(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .in("status", ["pending", "preparing", "ready"]);

  if (error) return { error: error.message };
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function recordPayment(
  orderId: string,
  formData: FormData,
) {
  const method = String(formData.get("payment_method") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const reference = String(formData.get("reference_number") ?? "").trim();

  if (!["cash", "gcash", "maya", "card"].includes(method)) {
    return { error: "Invalid payment method." };
  }
  const amount = Number(amountRaw);
  if (Number.isNaN(amount) || amount < 0) {
    return { error: "Amount must be a non-negative number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("transactions").insert({
    order_id: orderId,
    payment_method: method,
    amount,
    status: "paid",
    reference_number: reference || null,
    processed_by: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
  return { error: null };
}

export async function refundPayment(transactionId: string, orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({ status: "refunded" })
    .eq("id", transactionId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
  return { error: null };
}
