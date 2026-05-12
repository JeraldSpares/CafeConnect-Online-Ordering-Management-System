"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").insert({
    name,
    price,
    category_id: categoryId,
    description,
    is_available: true,
  });

  if (error) return { error: error.message };
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
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/menu");
  return { error: null };
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/menu");
  return { error: null };
}
