import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import { RecipeEditor } from "./recipe-editor";

export const dynamic = "force-dynamic";

export default async function MenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: item }, { data: ingredients }, { data: inventory }] =
    await Promise.all([
      supabase
        .from("menu_items")
        .select("id, name, price, description, is_available, category_id")
        .eq("id", id)
        .single(),
      supabase
        .from("menu_item_ingredients")
        .select(
          "id, quantity, notes, inventory_item_id, inventory_items ( id, name, unit, cost_per_unit )",
        )
        .eq("menu_item_id", id),
      supabase
        .from("inventory_items")
        .select("id, name, unit, cost_per_unit")
        .order("name"),
    ]);

  if (!item) notFound();

  type IngredientRow = {
    id: string;
    quantity: number;
    notes: string | null;
    inventory_item_id: string;
    inventory_name: string;
    inventory_unit: string;
    inventory_cost: number;
  };

  const recipe: IngredientRow[] = (ingredients ?? []).map((r) => {
    const inv = Array.isArray(r.inventory_items)
      ? r.inventory_items[0]
      : r.inventory_items;
    return {
      id: r.id,
      quantity: Number(r.quantity),
      notes: r.notes,
      inventory_item_id: r.inventory_item_id,
      inventory_name: inv?.name ?? "—",
      inventory_unit: inv?.unit ?? "",
      inventory_cost: Number(inv?.cost_per_unit ?? 0),
    };
  });

  const totalCost = recipe.reduce(
    (s, r) => s + r.quantity * r.inventory_cost,
    0,
  );
  const margin =
    Number(item.price) > 0 ? Number(item.price) - totalCost : 0;
  const marginPct =
    Number(item.price) > 0 ? (margin / Number(item.price)) * 100 : 0;

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <Link
        href="/admin/menu"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
      >
        <i className="fa-solid fa-arrow-left" /> Back to menu
      </Link>

      <header className="cc-card p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          Menu Item
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          {item.name}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {item.description ?? "No description"} ·{" "}
          <strong className="text-[var(--color-primary)]">
            {peso.format(Number(item.price))}
          </strong>
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Recipe cost" value={peso.format(totalCost)} icon="fa-coins" />
        <Stat
          label="Margin"
          value={peso.format(margin)}
          icon="fa-arrow-trend-up"
          accent={margin > 0}
          danger={margin <= 0 && totalCost > 0}
        />
        <Stat
          label="Margin %"
          value={`${marginPct.toFixed(1)}%`}
          icon="fa-percent"
          accent={marginPct >= 50}
          danger={marginPct < 0}
        />
      </section>

      <section className="cc-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-receipt text-[var(--color-accent)]" />
          Recipe — ingredients that get auto-deducted
        </h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          When an order containing this item moves to <strong>completed</strong>,
          each ingredient below is automatically deducted from inventory based
          on the quantity per serving.
        </p>
        <RecipeEditor
          menuItemId={item.id}
          existing={recipe.map((r) => ({
            id: r.id,
            inventory_item_id: r.inventory_item_id,
            inventory_name: r.inventory_name,
            inventory_unit: r.inventory_unit,
            quantity: r.quantity,
          }))}
          inventory={(inventory ?? []).map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            cost_per_unit: Number(i.cost_per_unit),
          }))}
        />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
  danger,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`cc-card cc-card-hover p-4 ${
        danger ? "border-[var(--color-danger)]" : ""
      } ${accent ? "border-[var(--color-success)]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-full ${
            danger
              ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
              : accent
                ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
          }`}
        >
          <i className={`fa-solid ${icon}`} />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            {label}
          </p>
          <p className="font-display text-xl font-bold text-[var(--color-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
