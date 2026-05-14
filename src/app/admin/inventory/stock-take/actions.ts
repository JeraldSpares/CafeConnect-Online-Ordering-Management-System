"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type StockTakeRow = {
  inventory_item_id: string;
  name: string;
  unit: string;
  expected: number;
  actual: number;
};

export async function submitStockTake(rows: StockTakeRow[], notes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const movements = rows
    .filter((r) => Number.isFinite(r.actual))
    .map((r) => {
      const delta = r.actual - r.expected;
      return { ...r, delta };
    })
    .filter((r) => Math.abs(r.delta) > 0.0001);

  if (movements.length === 0) {
    return { error: "No variances to record — counts all match." };
  }

  for (const m of movements) {
    await supabase.from("inventory_movements").insert({
      inventory_item_id: m.inventory_item_id,
      change_amount: m.delta,
      reason: "adjustment",
      notes: `Stock-take adjustment${notes ? ` — ${notes}` : ""}`,
      created_by: user?.id ?? null,
    });
    void logAudit({
      action: "inventory.stock_take",
      entityType: "inventory_item",
      entityId: m.inventory_item_id,
      entityLabel: m.name,
      metadata: {
        expected: m.expected,
        actual: m.actual,
        delta: m.delta,
        unit: m.unit,
      },
    });
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/stock-take");
  return {
    error: null,
    adjusted: movements.length,
    notes: `Recorded ${movements.length} variance${movements.length === 1 ? "" : "s"}.`,
  };
}
