import { createClient } from "@/lib/supabase/server";
import { NewItemForm } from "./new-item-form";
import { ItemRow } from "./item-row";
import { CategoriesSection } from "./categories-section";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, name, description, price, is_available, category_id")
      .order("name", { ascending: true }),
  ]);

  const categoryList = categories ?? [];
  const itemList = items ?? [];

  const grouped = new Map<string | null, typeof itemList>();
  for (const item of itemList) {
    const key = item.category_id;
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }

  const orderedGroups: { id: string | null; name: string }[] = [
    ...categoryList.map((c) => ({ id: c.id, name: c.name })),
    { id: null, name: "Uncategorized" },
  ].filter((g) => grouped.has(g.id));

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-utensils" /> Menu Management
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Menu
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Manage categories, add new items, and toggle availability. Hidden
          items don&apos;t appear on the customer ordering page.
        </p>
      </header>

      <CategoriesSection categories={categoryList} />
      <NewItemForm categories={categoryList} />

      {orderedGroups.length === 0 ? (
        <div className="cc-card p-10 text-center">
          <i className="fa-solid fa-mug-saucer text-4xl text-[var(--color-primary-200)]" />
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            No menu items yet. Add your first item above.
          </p>
        </div>
      ) : (
        orderedGroups.map((group) => {
          const groupItems = grouped.get(group.id) ?? [];
          return (
            <section key={group.id ?? "uncategorized"} className="cc-card overflow-hidden">
              <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
                <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
                  <i className="fa-solid fa-folder-open text-[var(--color-accent)]" />
                  {group.name}
                </h2>
                <span className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
                  {groupItems.length} item{groupItems.length === 1 ? "" : "s"}
                </span>
              </header>
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      price={Number(item.price)}
                      isAvailable={item.is_available}
                      description={item.description}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}
