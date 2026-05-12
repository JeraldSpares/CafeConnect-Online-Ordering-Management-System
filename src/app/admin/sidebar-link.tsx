"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-[var(--color-primary)] text-white shadow-md"
          : "text-[var(--color-text)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)]"
      }`}
    >
      <span
        className={`grid h-6 w-6 place-items-center text-[15px] ${
          active
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-primary)] group-hover:text-[var(--color-primary)]"
        }`}
      >
        <i className={`fa-solid ${icon}`} />
      </span>
      <span>{label}</span>
      {active && (
        <i className="fa-solid fa-circle ml-auto text-[6px] text-[var(--color-accent)]" />
      )}
    </Link>
  );
}
