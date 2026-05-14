import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForms } from "./profile-forms";
import { BusinessSettingsForm } from "./business-form";
import { loadSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone, created_at, updated_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-user-gear" /> Account
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Profile settings
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Update your name, contact info, sign-in email, and password.
        </p>
      </header>

      {/* Profile summary card */}
      <section className="cc-card relative overflow-hidden p-6">
        <div
          className="cc-bean"
          style={{
            width: 200,
            height: 140,
            top: -40,
            right: -30,
            opacity: 0.08,
          }}
        />
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary)] text-white text-2xl">
            <i className="fa-solid fa-user" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-2xl font-bold text-[var(--color-primary)]">
              {profile?.full_name ?? user.email}
            </p>
            <p className="text-sm text-[var(--color-muted)]">{user.email}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="chip bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                <i className="fa-solid fa-shield" /> {profile?.role ?? "user"}
              </span>
              {profile?.phone && (
                <span className="chip bg-[var(--color-accent-50)] text-[var(--color-accent)]">
                  <i className="fa-solid fa-phone" /> {profile.phone}
                </span>
              )}
              <span className="chip bg-[var(--color-line)] text-[var(--color-muted)]">
                <i className="fa-solid fa-calendar" /> Joined{" "}
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-PH", {
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <ProfileForms
        defaults={{
          fullName: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          email: user.email ?? "",
        }}
      />

      {profile?.role === "admin" && (
        <BusinessSettingsForm
          id="goal"
          defaults={await loadSettings()}
        />
      )}
    </div>
  );
}
