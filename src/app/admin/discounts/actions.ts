"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createDiscount(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const kind = String(formData.get("kind") ?? "percent");
  const amount = Number(formData.get("amount"));
  const minOrderTotal = Number(formData.get("min_order_total") ?? 0);
  const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();

  if (!code) return { error: "Code is required." };
  if (!["percent", "fixed"].includes(kind))
    return { error: "Invalid kind." };
  if (Number.isNaN(amount) || amount <= 0)
    return { error: "Amount must be > 0." };
  if (kind === "percent" && amount > 100)
    return { error: "Percent discount can't be more than 100." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discounts")
    .insert({
      code,
      description: description || null,
      kind,
      amount,
      min_order_total: minOrderTotal,
      max_uses: maxUsesRaw ? Number(maxUsesRaw) : null,
      expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  void logAudit({
    action: "discount.created",
    entityType: "discount",
    entityId: data?.id,
    entityLabel: code,
    metadata: { kind, amount },
  });
  revalidatePath("/admin/discounts");
  return { error: null };
}

export async function toggleDiscount(id: string, next: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("discounts")
    .update({ is_active: next })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/discounts");
  return { error: null };
}

export async function deleteDiscount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/discounts");
  return { error: null };
}
