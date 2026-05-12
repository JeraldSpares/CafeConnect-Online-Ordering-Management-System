import { createClient } from "@/lib/supabase/server";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
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
  ]);

  return <PosClient categories={categories ?? []} items={items ?? []} />;
}
