"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setSetting } from "@/lib/app-settings";

export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { error: null };
}

export async function updateEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return {
    error: null,
    notice:
      "Confirmation email sent. Click the link in your inbox to finish the change.",
  };
}

export async function updateBusinessSettings(formData: FormData) {
  const business_name = String(formData.get("business_name") ?? "").trim();
  const business_tin = String(formData.get("business_tin") ?? "").trim();
  const business_address = String(formData.get("business_address") ?? "").trim();
  const vatStr = String(formData.get("vat_rate") ?? "").trim();
  const goalStr = String(formData.get("revenue_goal_monthly") ?? "").trim();
  const loyaltyStr = String(formData.get("loyalty_threshold") ?? "").trim();
  const demoMode = formData.get("demo_mode") === "on";

  const vat_rate = Number(vatStr);
  const revenue_goal_monthly = Number(goalStr);
  const loyalty_threshold = Number(loyaltyStr);

  if (Number.isNaN(vat_rate) || vat_rate < 0 || vat_rate > 1) {
    return { error: "VAT rate must be between 0 and 1 (e.g. 0.12 for 12%)." };
  }
  if (Number.isNaN(revenue_goal_monthly) || revenue_goal_monthly < 0) {
    return { error: "Revenue goal must be a positive number." };
  }
  if (
    Number.isNaN(loyalty_threshold) ||
    loyalty_threshold < 2 ||
    loyalty_threshold > 50
  ) {
    return { error: "Loyalty threshold must be between 2 and 50." };
  }

  const updates: Array<readonly [string, unknown]> = [
    ["business_name", business_name || "Hebrews Kape"],
    ["business_tin", business_tin || "000-000-000-000"],
    ["business_address", business_address || ""],
    ["vat_rate", vat_rate],
    ["revenue_goal_monthly", revenue_goal_monthly],
    ["loyalty_threshold", loyalty_threshold],
    ["demo_mode", demoMode],
  ];

  for (const [k, v] of updates) {
    const res = await setSetting(k as never, v);
    if (res.error) return { error: res.error };
  }

  revalidatePath("/admin");
  return { error: null, notice: "Business settings saved." };
}

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { error: null, notice: "Password updated." };
}
