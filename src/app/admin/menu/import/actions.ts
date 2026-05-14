"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ImportRow = {
  name: string;
  category: string;
  price: number;
  description?: string;
  image_url?: string;
};

export async function importMenuCsv(rows: ImportRow[]) {
  if (rows.length === 0) return { error: "No rows to import." };

  const supabase = await createClient();

  // Resolve / create categories first
  const uniqueCats = Array.from(
    new Set(
      rows
        .map((r) => r.category?.trim())
        .filter((c): c is string => !!c && c.length > 0),
    ),
  );

  const { data: existingCats } = await supabase
    .from("categories")
    .select("id, name");
  const catByName = new Map(
    (existingCats ?? []).map((c) => [c.name.toLowerCase(), c.id] as const),
  );

  for (const c of uniqueCats) {
    if (!catByName.has(c.toLowerCase())) {
      const { data: newCat } = await supabase
        .from("categories")
        .insert({ name: c })
        .select("id")
        .single();
      if (newCat) catByName.set(c.toLowerCase(), newCat.id);
    }
  }

  // Insert menu items
  const toInsert = rows.map((r) => ({
    name: r.name.trim(),
    price: r.price,
    description: r.description?.trim() || null,
    image_url: r.image_url?.trim() || null,
    category_id: r.category?.trim()
      ? (catByName.get(r.category.trim().toLowerCase()) ?? null)
      : null,
    is_available: true,
  }));

  const { data: inserted, error } = await supabase
    .from("menu_items")
    .insert(toInsert)
    .select("id");
  if (error) return { error: error.message };

  void logAudit({
    action: "menu_item.bulk_imported",
    entityType: "menu_item",
    metadata: { count: inserted?.length ?? 0 },
  });

  revalidatePath("/admin/menu");
  return {
    error: null,
    imported: inserted?.length ?? 0,
    categoriesCreated:
      uniqueCats.filter((c) => !existingCats?.some((e) => e.name.toLowerCase() === c.toLowerCase()))
        .length,
  };
}
