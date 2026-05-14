"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const FILIPINO_FIRST = [
  "Maria", "Juan", "Jose", "Anna", "Mark", "Jasmine", "Carlo", "Rica",
  "Ramon", "Lyka", "Patrick", "Kim", "Dennis", "Carla", "Lance", "Mae",
  "Reggie", "Bea", "Mico", "Liza", "Edgar", "Ysa", "Andrei", "Sofia",
];
const FILIPINO_LAST = [
  "Santos", "Cruz", "Reyes", "Garcia", "Tan", "Aquino", "Bautista", "Mendoza",
  "Dela Cruz", "Villanueva", "Ramos", "Castillo", "Pascual", "Ocampo",
];
const ORDER_NOTES = [
  null, null, null,
  "Less sugar please",
  "Extra hot",
  "Iced",
  "No whipped cream",
  "To go",
  "For takeout",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Mostly-daytime distribution biased toward mornings + lunch + afternoon snack
function randomHourOfDay(): number {
  const r = Math.random();
  if (r < 0.3) return randomInt(7, 10); // morning
  if (r < 0.55) return randomInt(11, 13); // lunch
  if (r < 0.8) return randomInt(14, 17); // afternoon
  return randomInt(18, 21); // evening
}

export async function generateDemoOrders(days: number = 30) {
  const supabase = await createClient();

  // Pull menu items + categories
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .eq("is_available", true);
  if (!items || items.length === 0) {
    return { error: "Menu is empty — seed demo menu items first." };
  }

  let ordersCreated = 0;
  let customersCreated = 0;
  let paymentsCreated = 0;

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    // Realistic daily order count (5-25 per day, more on weekends)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dayOrders = randomInt(
      isWeekend ? 10 : 5,
      isWeekend ? 25 : 18,
    );

    for (let i = 0; i < dayOrders; i++) {
      const hour = randomHourOfDay();
      const minute = randomInt(0, 59);
      const placedAt = new Date(date);
      placedAt.setHours(hour, minute, randomInt(0, 59), 0);

      // Customer (reuse some, create new ones)
      const reuseCustomer = Math.random() < 0.35; // 35% returning
      let customerId: string | null = null;

      if (reuseCustomer) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .limit(50);
        if (existing && existing.length > 0) {
          customerId = pick(existing).id;
        }
      }

      if (!customerId) {
        const firstName = pick(FILIPINO_FIRST);
        const lastName = pick(FILIPINO_LAST);
        const fullName = `${firstName} ${lastName}`;
        const phone = `09${randomInt(10, 99)}${randomInt(1000000, 9999999)}`;
        const { data: newCust } = await supabase
          .from("customers")
          .insert({
            full_name: fullName,
            phone,
            email:
              Math.random() < 0.4
                ? `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, "")}@example.com`
                : null,
            created_at: placedAt.toISOString(),
          })
          .select("id")
          .single();
        if (newCust) {
          customerId = newCust.id;
          customersCreated += 1;
        }
      }

      // Order with 1–4 line items
      const lineCount = randomInt(1, 4);
      const chosen = new Set<number>();
      let subtotal = 0;
      const lines: {
        menu_item_id: string;
        item_name: string;
        quantity: number;
        unit_price: number;
        line_total: number;
      }[] = [];
      while (chosen.size < lineCount && chosen.size < items.length) {
        const idx = randomInt(0, items.length - 1);
        if (chosen.has(idx)) continue;
        chosen.add(idx);
        const item = items[idx];
        const qty = randomInt(1, 3);
        const lineTotal = Math.round(Number(item.price) * qty * 100) / 100;
        subtotal += lineTotal;
        lines.push({
          menu_item_id: item.id,
          item_name: item.name,
          quantity: qty,
          unit_price: Number(item.price),
          line_total: lineTotal,
        });
      }

      // 92% completed, 5% cancelled, 3% recent active
      const r = Math.random();
      let status: "completed" | "cancelled" | "preparing" | "ready" | "pending";
      if (dayOffset === 0 && r < 0.15) {
        status = pick(["pending", "preparing", "ready"]) as
          | "pending"
          | "preparing"
          | "ready";
      } else if (r < 0.92) {
        status = "completed";
      } else if (r < 0.97) {
        status = "cancelled";
      } else {
        status = "completed";
      }

      const orderType = Math.random() < 0.6 ? "takeaway" : "dine_in";
      const notes = pick(ORDER_NOTES);

      const completedAt =
        status === "completed"
          ? new Date(placedAt.getTime() + randomInt(3, 15) * 60_000).toISOString()
          : null;

      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          status,
          order_type: orderType,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100,
          notes,
          created_at: placedAt.toISOString(),
          completed_at: completedAt,
        })
        .select("id")
        .single();

      if (orderError || !newOrder) continue;

      // Insert order_items
      const itemRows = lines.map((l) => ({
        order_id: newOrder.id,
        menu_item_id: l.menu_item_id,
        item_name: l.item_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_total: l.line_total,
      }));
      await supabase.from("order_items").insert(itemRows);

      // Payment for completed orders
      if (status === "completed") {
        const method = pick(["cash", "cash", "gcash", "gcash", "maya", "card"]);
        await supabase.from("transactions").insert({
          order_id: newOrder.id,
          payment_method: method,
          amount: Math.round(subtotal * 100) / 100,
          status: "paid",
          reference_number:
            method === "cash" ? null : `REF${randomInt(100000, 999999)}`,
          created_at: completedAt ?? placedAt.toISOString(),
        });
        paymentsCreated += 1;
      }

      ordersCreated += 1;
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/reports");

  return {
    error: null,
    ordersCreated,
    customersCreated,
    paymentsCreated,
    days,
  };
}

export async function generateInventoryHistory(days: number = 14) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, unit");
  if (!items || items.length === 0)
    return { error: "Inventory is empty — seed inventory items first." };

  let movements = 0;
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    date.setHours(randomInt(7, 18), randomInt(0, 59));

    // 1-3 movements per day across random items
    const moves = randomInt(1, 3);
    for (let i = 0; i < moves; i++) {
      const item = pick(items);
      const reason = pick([
        "restock",
        "wastage",
        "adjustment",
        "order_deduction",
      ]) as "restock" | "wastage" | "adjustment" | "order_deduction";
      const sign =
        reason === "restock"
          ? 1
          : reason === "wastage" || reason === "order_deduction"
            ? -1
            : Math.random() < 0.5
              ? 1
              : -1;
      const magnitude = randomFloat(0.5, 5);
      await supabase.from("inventory_movements").insert({
        inventory_item_id: item.id,
        change_amount: Math.round(sign * magnitude * 1000) / 1000,
        reason,
        notes: reason === "wastage" ? "spilled/spoiled" : null,
        created_at: date.toISOString(),
      });
      movements += 1;
    }
  }

  revalidatePath("/admin/inventory");
  return { error: null, movements, days };
}

export async function purgeDemoData() {
  const supabase = await createClient();
  // Order matters — delete dependents first
  await supabase.from("transactions").delete().not("id", "is", null);
  await supabase.from("order_items").delete().not("id", "is", null);
  await supabase.from("orders").delete().not("id", "is", null);
  await supabase.from("customers").delete().not("id", "is", null);
  await supabase.from("inventory_movements").delete().not("id", "is", null);
  await supabase.from("audit_logs").delete().not("id", "is", null);

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/audit-logs");

  return { error: null };
}
