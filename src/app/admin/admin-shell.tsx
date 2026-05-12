"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarLink } from "./sidebar-link";
import { BrandLogo } from "@/components/brand-logo";

type NavLink = { href: string; label: string; icon: string };

export function AdminShell({
  navLinks,
  user,
  children,
}: {
  navLinks: NavLink[];
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when the drawer is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <div className="flex min-h-screen flex-1 bg-[var(--color-bg)]">
      {/* Desktop sidebar — sticky to viewport so it stays fixed while content scrolls */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start border-r border-[var(--color-line)] bg-white shadow-sm lg:flex">
        <SidebarBrand />
        <nav className="flex-1 space-y-0.5 px-3 pb-4 pt-3">
          {navLinks.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
            />
          ))}
        </nav>
        <SidebarUserCard user={user} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-[var(--color-primary-700)]/40 backdrop-blur-sm transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[var(--color-line)] bg-white shadow-xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarBrand onClose={() => setOpen(false)} />
          <nav className="flex-1 space-y-0.5 px-3 pb-4 pt-3">
            {navLinks.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
              />
            ))}
          </nav>
          <SidebarUserCard user={user} />
        </aside>
      </div>

      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-line)] bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
            aria-label="Open menu"
          >
            <i className="fa-solid fa-bars" />
          </button>
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <BrandLogo size={40} />
            <span className="font-display font-bold text-[var(--color-primary)]">
              CafeConnect
            </span>
          </Link>
          <Link
            href="/admin/pos"
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary)] text-white"
            aria-label="POS"
          >
            <i className="fa-solid fa-cash-register" />
          </Link>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarBrand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-5">
      <Link href="/admin/dashboard" className="flex items-center gap-3">
        <BrandLogo size={56} />
        <span>
          <span className="block text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
            CafeConnect
          </span>
          <span className="font-display block text-base font-bold leading-tight text-[var(--color-primary)]">
            Admin Portal
          </span>
        </span>
      </Link>
      {onClose && (
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          aria-label="Close menu"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
}

function SidebarUserCard({ user }: { user: { name: string; role: string } }) {
  return (
    <div className="border-t border-[var(--color-line)] p-4">
      <div className="rounded-xl bg-[var(--color-primary-50)] p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-white">
            <i className="fa-solid fa-user" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-primary)]">
              {user.name}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
              {user.role}
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
  );
}
