"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name,
    description: (formData.get("description") as string) || null,
    sort_order: Number(formData.get("sort_order") ?? 0),
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/menu");
  return { error: null };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/menu");
  return { error: null };
}

export async function createMenuItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  if (!name) return { error: "Name is required." };
  const price = Number(priceRaw);
  if (Number.isNaN(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }

  const categoryId = (formData.get("category_id") as string) || null;
  const description = (formData.get("description") as string) || null;
  const imageUrl = ((formData.get("image_url") as string) || "").trim() || null;

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("menu_items")
    .insert({
      name,
      price,
      category_id: categoryId,
      description,
      image_url: imageUrl,
      is_available: true,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  void logAudit({
    action: "menu_item.created",
    entityType: "menu_item",
    entityId: inserted?.id,
    entityLabel: name,
    metadata: { price },
  });
  revalidatePath("/admin/menu");
  return { error: null };
}

export async function updateMenuItem(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  if (!name) return { error: "Name is required." };
  const price = Number(priceRaw);
  if (Number.isNaN(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name,
      price,
      category_id: (formData.get("category_id") as string) || null,
      description: (formData.get("description") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/menu");
  return { error: null };
}

export async function toggleMenuItemAvailability(id: string, next: boolean) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("menu_items")
    .select("name")
    .eq("id", id)
    .single();
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  void logAudit({
    action: next ? "menu_item.shown" : "menu_item.hidden",
    entityType: "menu_item",
    entityId: id,
    entityLabel: row?.name ?? null,
  });
  revalidatePath("/admin/menu");
  return { error: null };
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("menu_items")
    .select("name")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  void logAudit({
    action: "menu_item.deleted",
    entityType: "menu_item",
    entityId: id,
    entityLabel: row?.name ?? null,
  });
  revalidatePath("/admin/menu");
  return { error: null };
}
