import { createClient } from "@/lib/supabase/server";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const supabase = await createClient();

  const [
    { data: categories },
    { data: items },
    { data: recipes },
    { data: inventory },
    { data: tableSetting },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name"),
    supabase
      .from("menu_items")
      .select("id, name, description, price, category_id, is_available")
      .eq("is_available", true)
      .order("name"),
    supabase
      .from("menu_item_ingredients")
      .select("menu_item_id, inventory_item_id, quantity"),
    supabase
      .from("inventory_items")
      .select("id, stock_quantity, reorder_level"),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "table_count")
      .maybeSingle(),
  ]);

  const tableCount = Math.max(0, Number(tableSetting?.value ?? 0));

  // Join recipes ↔ inventory in JS — the Supabase type file has empty
  // Relationships, so a relational select fails at compile time.
  const invById = new Map(
    (inventory ?? []).map((i) => [
      i.id,
      {
        stock: Number(i.stock_quantity),
        reorder: Number(i.reorder_level),
      },
    ]),
  );

  // Worst-case rollup per menu item: out > low > ok
  // - "out": at least one ingredient has less stock than the recipe needs
  // - "low": at least one ingredient is at or below its reorder threshold
  // - "ok":  all ingredients comfortable, OR no recipe defined
  const stockMap: Record<string, "ok" | "low" | "out"> = {};
  for (const r of recipes ?? []) {
    const inv = invById.get(r.inventory_item_id);
    if (!inv) continue;
    const needed = Number(r.quantity);
    let status: "ok" | "low" | "out" = "ok";
    if (inv.stock < needed) status = "out";
    else if (inv.stock <= inv.reorder) status = "low";

    const prev = stockMap[r.menu_item_id];
    if (prev === "out") continue;
    if (prev === "low" && status === "ok") continue;
    stockMap[r.menu_item_id] = status;
  }

  return (
    <PosClient
      categories={categories ?? []}
      items={items ?? []}
      stockMap={stockMap}
      tableCount={tableCount}
    />
  );
}
