"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createInventoryItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  if (!name) return { error: "Name is required." };
  if (!unit) return { error: "Unit is required." };

  const stock = Number(formData.get("stock_quantity") ?? 0);
  const reorder = Number(formData.get("reorder_level") ?? 0);
  const cost = Number(formData.get("cost_per_unit") ?? 0);
  if ([stock, reorder, cost].some((n) => Number.isNaN(n) || n < 0)) {
    return { error: "Numbers must be non-negative." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").insert({
    name,
    unit,
    stock_quantity: stock,
    reorder_level: reorder,
    cost_per_unit: cost,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function deleteInventoryItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/inventory");
  return { error: null };
}

export async function recordMovement(itemId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "");
  if (!["restock", "wastage", "adjustment"].includes(reason)) {
    return { error: "Invalid movement reason." };
  }
  const magnitude = Number(formData.get("amount") ?? 0);
  if (Number.isNaN(magnitude) || magnitude === 0) {
    return { error: "Enter a non-zero amount." };
  }

  // restock = positive, wastage = negative, adjustment = signed
  let change = magnitude;
  if (reason === "wastage") change = -Math.abs(magnitude);
  if (reason === "restock") change = Math.abs(magnitude);

  const notes = (formData.get("notes") as string)?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("inventory_movements").insert({
    inventory_item_id: itemId,
    change_amount: change,
    reason,
    notes,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  const { data: item } = await supabase
    .from("inventory_items")
    .select("name, unit")
    .eq("id", itemId)
    .single();

  void logAudit({
    action: `inventory.${reason}`,
    entityType: "inventory_item",
    entityId: itemId,
    entityLabel: item?.name ?? null,
    metadata: { change, unit: item?.unit, notes: notes ?? null },
  });

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${itemId}`);
  revalidatePath("/admin/dashboard");
  return { error: null };
}
