"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function startShift() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Refuse to open a new shift if one is already open for this user
  const { data: existing } = await supabase
    .from("shifts")
    .select("id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) return { error: "You already have an open shift." };

  const { data, error } = await supabase
    .from("shifts")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  void logAudit({
    action: "shift.started",
    entityType: "shift",
    entityId: data?.id,
  });

  revalidatePath("/admin/shifts");
  revalidatePath("/admin");
  return { error: null };
}

export async function endShift(shiftId: string, notes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("shifts")
    .update({
      ended_at: new Date().toISOString(),
      notes: notes?.trim() || null,
    })
    .eq("id", shiftId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  void logAudit({
    action: "shift.ended",
    entityType: "shift",
    entityId: shiftId,
    metadata: notes ? { notes } : undefined,
  });

  revalidatePath("/admin/shifts");
  revalidatePath("/admin");
  return { error: null };
}
