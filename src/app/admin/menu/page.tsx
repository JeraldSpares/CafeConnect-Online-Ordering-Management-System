import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewItemForm } from "./new-item-form";
import { ItemRow } from "./item-row";
import { CategoriesSection } from "./categories-section";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = typeof sp.cat === "string" ? sp.cat : "all";
  const status = typeof sp.status === "string" ? sp.status : "all";
  const sort =
    typeof sp.sort === "string" && ["name", "price"].includes(sp.sort)
      ? sp.sort
      : "name";

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
      .order(sort, { ascending: sort === "price" ? false : true }),
  ]);

  const categoryList = categories ?? [];
  const allItems = items ?? [];

  // Apply filters
  const filtered = allItems.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat !== "all") {
      if (cat === "uncategorized" && i.category_id !== null) return false;
      if (cat !== "uncategorized" && i.category_id !== cat) return false;
    }
    if (status === "available" && !i.is_available) return false;
    if (status === "hidden" && i.is_available) return false;
    return true;
  });

  // Group only when no category filter is active
  const grouped = new Map<string | null, typeof filtered>();
  for (const item of filtered) {
    const key = item.category_id;
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }
  const orderedGroups: { id: string | null; name: string }[] = [
    ...categoryList.map((c) => ({ id: c.id, name: c.name })),
    { id: null, name: "Uncategorized" },
  ].filter((g) => grouped.has(g.id));

  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);
  if (cat !== "all") filterParams.set("cat", cat);
  if (status !== "all") filterParams.set("status", status);
  if (sort !== "name") filterParams.set("sort", sort);

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

      {/* Search + sort */}
      <form
        action="/admin/menu"
        method="get"
        className="cc-card flex flex-wrap items-center gap-2 p-4"
      >
        <div className="relative min-w-48 flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search menu items…"
            className="cc-input !pl-10"
          />
        </div>
        <select
          name="sort"
          defaultValue={sort}
          className="cc-input !py-2 text-sm"
        >
          <option value="name">Sort: Name (A→Z)</option>
          <option value="price">Sort: Price (high→low)</option>
        </select>
        {cat !== "all" && <input type="hidden" name="cat" value={cat} />}
        {status !== "all" && (
          <input type="hidden" name="status" value={status} />
        )}
        <button type="submit" className="btn-primary">
          <i className="fa-solid fa-magnifying-glass" /> Apply
        </button>
        {(q || cat !== "all" || status !== "all" || sort !== "name") && (
          <a
            href="/admin/menu"
            className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-xmark" /> Clear all
          </a>
        )}
      </form>

      {/* Filter pills */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            Category
          </span>
          <FilterPill
            label="All"
            active={cat === "all"}
            href={(() => {
              const p = new URLSearchParams(filterParams);
              p.delete("cat");
              return `/admin/menu${p.toString() ? `?${p}` : ""}`;
            })()}
          />
          {categoryList.map((c) => (
            <FilterPill
              key={c.id}
              label={c.name}
              active={cat === c.id}
              href={(() => {
                const p = new URLSearchParams(filterParams);
                p.set("cat", c.id);
                return `/admin/menu?${p}`;
              })()}
            />
          ))}
          <FilterPill
            label="Uncategorized"
            active={cat === "uncategorized"}
            href={(() => {
              const p = new URLSearchParams(filterParams);
              p.set("cat", "uncategorized");
              return `/admin/menu?${p}`;
            })()}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            Availability
          </span>
          {[
            { key: "all", label: "All" },
            { key: "available", label: "Available" },
            { key: "hidden", label: "Hidden" },
          ].map((s) => (
            <FilterPill
              key={s.key}
              label={s.label}
              active={status === s.key}
              href={(() => {
                const p = new URLSearchParams(filterParams);
                if (s.key === "all") p.delete("status");
                else p.set("status", s.key);
                return `/admin/menu${p.toString() ? `?${p}` : ""}`;
              })()}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Showing <strong>{filtered.length}</strong> of {allItems.length} items
      </p>

      {orderedGroups.length === 0 ? (
        <div className="cc-card p-10 text-center">
          <i className="fa-solid fa-mug-saucer text-4xl text-[var(--color-primary-200)]" />
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {q || cat !== "all" || status !== "all"
              ? "No items match the current filters."
              : "No menu items yet. Add your first item above."}
          </p>
        </div>
      ) : (
        orderedGroups.map((group) => {
          const groupItems = grouped.get(group.id) ?? [];
          return (
            <section
              key={group.id ?? "uncategorized"}
              className="cc-card overflow-hidden"
            >
              <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
                <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
                  <i className="fa-solid fa-folder-open text-[var(--color-accent)]" />
                  {group.name}
                </h2>
                <span className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
                  {groupItems.length} item{groupItems.length === 1 ? "" : "s"}
                </span>
              </header>
              <div className="overflow-x-auto">
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
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
      }`}
    >
      {label}
    </Link>
  );
}
