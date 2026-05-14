import { DevTools } from "./dev-tools";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DevToolsPage() {
  const supabase = await createClient();
  const [{ count: orderCount }, { count: customerCount }, { count: itemCount }] =
    await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase
        .from("inventory_movements")
        .select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-flask" /> Dev Tools
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Demo data generator
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          One-click utilities for populating the database with realistic-looking
          orders, customers, and inventory movements so the dashboard,
          analytics, and heatmap aren&apos;t empty during your defense.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={orderCount ?? 0} icon="fa-receipt" />
        <Stat label="Customers" value={customerCount ?? 0} icon="fa-users" />
        <Stat
          label="Inventory movements"
          value={itemCount ?? 0}
          icon="fa-arrow-trend-up"
        />
      </section>

      <DevTools />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="cc-card cc-card-hover p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
          <i className={`fa-solid ${icon}`} />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            {label}
          </p>
          <p className="font-display text-2xl font-bold text-[var(--color-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
