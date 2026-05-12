import { createClient } from "@/lib/supabase/server";
import { MenuGrid } from "./menu-grid";

export const revalidate = 30;

export default async function CustomerMenuPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name"),
    supabase
      .from("menu_items")
      .select("id, name, description, price, category_id, is_available, image_url")
      .eq("is_available", true)
      .order("name"),
  ]);

  return (
    <div>
      <header className="mb-2 animate-fade-up">
        <span className="chip bg-[var(--color-accent-50)] text-[var(--color-accent)]">
          <i className="fa-solid fa-mug-saucer" /> Today&apos;s Menu
        </span>
        <h1 className="font-display mt-3 text-4xl font-bold text-[var(--color-primary)] sm:text-5xl">
          What&apos;s your mood today?
        </h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Hand-picked espresso, cold brews, and pastries — fresh every morning.
          Add to cart, breeze through checkout, and pick it up when ready.
        </p>
      </header>

      <MenuGrid categories={categories ?? []} items={items ?? []} />
    </div>
  );
}
