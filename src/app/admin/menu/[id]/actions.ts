"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function addIngredient(
  menuItemId: string,
  inventoryItemId: string,
  quantity: number,
) {
  if (!inventoryItemId) return { error: "Pick an ingredient." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "Quantity must be > 0." };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_item_ingredients").insert({
    menu_item_id: menuItemId,
    inventory_item_id: inventoryItemId,
    quantity,
  });
  if (error) return { error: error.message };

  void logAudit({
    action: "recipe.ingredient_added",
    entityType: "menu_item",
    entityId: menuItemId,
    metadata: { inventory_item_id: inventoryItemId, quantity },
  });
  revalidatePath(`/admin/menu/${menuItemId}`);
  return { error: null };
}

export async function removeIngredient(id: string, menuItemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_item_ingredients")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  void logAudit({
    action: "recipe.ingredient_removed",
    entityType: "menu_item",
    entityId: menuItemId,
  });
  revalidatePath(`/admin/menu/${menuItemId}`);
  return { error: null };
}
