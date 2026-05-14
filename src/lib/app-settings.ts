import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AppSettingsMap = {
  revenue_goal_monthly?: number;
  demo_mode?: boolean;
  business_name?: string;
  business_tin?: string;
  business_address?: string;
  vat_rate?: number;
  loyalty_threshold?: number;
};

const DEFAULTS: Required<AppSettingsMap> = {
  revenue_goal_monthly: 30000,
  demo_mode: false,
  business_name: "Hebrews Kape",
  business_tin: "000-000-000-000",
  business_address: "Cabanatuan City, Nueva Ecija",
  vat_rate: 0.12,
  loyalty_threshold: 10,
};

export async function loadSettings(): Promise<Required<AppSettingsMap>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value");
    if (error || !data) return { ...DEFAULTS };
    const merged: Required<AppSettingsMap> = { ...DEFAULTS };
    for (const row of data) {
      const k = row.key as keyof AppSettingsMap;
      // value is JSONB — Supabase returns parsed JS values
      (merged as Record<string, unknown>)[k] = row.value as never;
    }
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setSetting(
  key: keyof AppSettingsMap,
  value: unknown,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("app_settings").upsert({
    key,
    value: value as never,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  });
  return { error: error?.message ?? null };
}
