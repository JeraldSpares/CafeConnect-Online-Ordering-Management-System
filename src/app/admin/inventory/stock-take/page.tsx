import { createClient } from "@/lib/supabase/server";
import { StockTakeForm } from "./stock-take-form";

export const dynamic = "force-dynamic";

export default async function StockTakePage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, unit, stock_quantity")
    .order("name");

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-clipboard-check" /> Physical Count
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Stock-take
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Walk through your stock room, count what you actually have, then
          enter the real numbers below. We&apos;ll record an
          <strong className="text-[var(--color-primary)]"> adjustment </strong>
          movement for every item where the count differs from the expected.
        </p>
      </header>

      <StockTakeForm
        items={(items ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          expected: Number(i.stock_quantity),
        }))}
      />
    </div>
  );
}
