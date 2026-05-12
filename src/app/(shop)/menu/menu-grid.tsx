"use client";

import { useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { peso } from "@/lib/format";

type Category = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  is_available: boolean;
};

// Pick an icon based on category or item name keywords
function iconFor(name: string): string {
  const n = name.toLowerCase();
  if (/espresso|americano|cappuccino|latte|coffee|brew|mocha/.test(n)) return "fa-mug-hot";
  if (/iced|cold|frappe|frappuccino|smoothie/.test(n))               return "fa-glass-water";
  if (/tea/.test(n))                                                  return "fa-leaf";
  if (/croissant|pastry|pastries|muffin|cake|bread|donut|sandwich/.test(n)) return "fa-cookie-bite";
  if (/juice/.test(n))                                                return "fa-glass-citrus";
  return "fa-mug-saucer";
}

export function MenuGrid({
  categories,
  items,
}: {
  categories: Category[];
  items: Item[];
}) {
  const { add } = useCart();
  const [active, setActive] = useState<string>("all");
  const [added, setAdded] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const groups = useMemo(() => {
    const list: { id: string; name: string; items: Item[] }[] = [
      ...categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: items.filter((i) => i.category_id === c.id),
      })),
    ];
    const other = items.filter((i) => !i.category_id);
    if (other.length > 0) list.push({ id: "other", name: "Other", items: other });
    return list.filter((g) => g.items.length > 0);
  }, [categories, items]);

  function handleAdd(item: Item) {
    add({
      menu_item_id: item.id,
      name: item.name,
      unit_price: Number(item.price),
    });
    setAdded(item.id);
    setTimeout(() => setAdded((cur) => (cur === item.id ? null : cur)), 900);
  }

  function scrollTo(id: string) {
    setActive(id);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (groups.length === 0) {
    return (
      <div className="cc-card p-10 text-center">
        <i className="fa-solid fa-mug-saucer text-4xl text-[var(--color-primary-200)]" />
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          No items available right now. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky category tabs */}
      <div className="sticky top-[57px] z-30 -mx-6 mb-6 border-y border-[var(--color-line)] bg-[var(--color-bg)]/90 px-6 py-3 backdrop-blur-md">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <CategoryTab
            label="All"
            icon="fa-grip"
            active={active === "all"}
            onClick={() => scrollTo("all")}
          />
          {groups.map((g) => (
            <CategoryTab
              key={g.id}
              label={g.name}
              icon={iconFor(g.name)}
              active={active === g.id}
              onClick={() => scrollTo(g.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {groups.map((group, gi) => (
          <section
            key={group.id}
            id={`cat-${group.id}`}
            ref={(el) => {
              sectionRefs.current[group.id] = el;
            }}
            className="scroll-mt-32 animate-fade-up"
            style={{ animationDelay: `${gi * 0.06}s` }}
          >
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold text-[var(--color-primary)]">
                {group.name}
              </h2>
              <span className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
                {group.items.length} item{group.items.length === 1 ? "" : "s"}
              </span>
            </div>

            <div
              data-stagger
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {group.items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  added={added === item.id}
                  onAdd={() => handleAdd(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CategoryTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-md"
          : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
      }`}
    >
      <i className={`fa-solid ${icon} ${active ? "text-[var(--color-accent)]" : ""}`} />
      <span>{label}</span>
    </button>
  );
}

function ProductCard({
  item,
  added,
  onAdd,
}: {
  item: Item;
  added: boolean;
  onAdd: () => void;
}) {
  const icon = iconFor(item.name);
  return (
    <article className="cc-card cc-card-hover group flex flex-col overflow-hidden">
      {/* Disc */}
      <div className="relative h-44 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-accent-50)]">
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-28 w-28 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)] shadow-[0_18px_40px_-12px_rgba(20,39,31,0.5)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
            <i className={`fa-solid ${icon} text-5xl`} />
          </div>
        </div>
        <span className="absolute right-3 top-3 chip bg-white/90 text-[var(--color-primary)] shadow-sm">
          <i className="fa-solid fa-fire-flame-curved text-[var(--color-accent)]" /> Fresh
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold text-[var(--color-primary)]">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              Price
            </p>
            <p className="font-display text-2xl font-bold text-[var(--color-primary)]">
              {peso.format(Number(item.price))}
            </p>
          </div>
          <button
            onClick={onAdd}
            className={`btn-primary !px-4 !py-2 transition-all ${
              added ? "!bg-[var(--color-success)]" : ""
            }`}
          >
            {added ? (
              <>
                <i className="fa-solid fa-check" /> Added
              </>
            ) : (
              <>
                <i className="fa-solid fa-plus" /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
