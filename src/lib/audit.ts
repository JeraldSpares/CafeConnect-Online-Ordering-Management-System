import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AuditEntry = {
  action: string;            // verb.noun — e.g. "order.status_changed"
  entityType: string;        // "order", "menu_item", "inventory_item", etc.
  entityId?: string | null;
  entityLabel?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Record a staff action. Fails silently — never blocks the calling
 * action if the audit_logs table is missing or RLS rejects the insert.
 * Apply supabase/migrations/audit_logs.sql to enable logging.
 */
export async function logAudit(entry: AuditEntry) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_name: profile?.full_name ?? user.email ?? null,
      actor_role: profile?.role ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      metadata: (entry.metadata ?? null) as never,
    });
  } catch (e) {
    // Swallow all errors — audit logging must never break user actions.
    if (process.env.NODE_ENV === "development") {
      console.warn("[audit] log failed:", e);
    }
  }
}
