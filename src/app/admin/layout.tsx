import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarLink } from "./sidebar-link";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "fa-gauge-high" },
  { href: "/admin/orders",    label: "Orders",    icon: "fa-receipt" },
  { href: "/admin/menu",      label: "Menu",      icon: "fa-utensils" },
  { href: "/admin/inventory", label: "Inventory", icon: "fa-boxes-stacked" },
  { href: "/admin/customers", label: "Customers", icon: "fa-users" },
  { href: "/admin/reports",   label: "Reports",   icon: "fa-chart-line" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile && profile.role === "customer") redirect("/");

  return (
    <div className="flex min-h-screen flex-1 bg-[var(--color-bg)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-line)] bg-white shadow-sm lg:flex">
        <div className="border-b border-[var(--color-line)] px-6 py-5">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
              <i className="fa-solid fa-mug-saucer" />
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
                CafeConnect
              </span>
              <span className="font-display block text-base font-bold text-[var(--color-primary)]">
                Admin
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_LINKS.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
            />
          ))}
        </nav>

        <div className="border-t border-[var(--color-line)] p-4">
          <div className="rounded-xl bg-[var(--color-primary-50)] p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-white">
                <i className="fa-solid fa-user" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-primary)]">
                  {profile?.full_name ?? user.email}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
                  {profile?.role ?? "user"}
                </p>
              </div>
            </div>
            <form action="/auth/sign-out" method="post" className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-primary)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
              >
                <i className="fa-solid fa-right-from-bracket" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
