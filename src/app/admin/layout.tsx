import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "./admin-shell";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "fa-gauge-high" },
  { href: "/admin/orders",    label: "Orders",    icon: "fa-receipt" },
  { href: "/admin/pos",       label: "POS",       icon: "fa-cash-register" },
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
    <AdminShell
      navLinks={NAV_LINKS}
      user={{
        name: profile?.full_name ?? user.email ?? "User",
        role: profile?.role ?? "user",
      }}
    >
      {children}
    </AdminShell>
  );
}
