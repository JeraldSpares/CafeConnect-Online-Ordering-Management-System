"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast";

type Notification = {
  id: string;
  kind: "new_order" | "payment" | "status";
  title: string;
  detail: string;
  href: string;
  at: string;
};

const STORAGE_LAST_SEEN = "cafeconnect.bell.lastSeen.v1";
const MAX_NOTIFS = 20;

export function NotificationsBell() {
  const router = useRouter();
  const toast = useToast();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(STORAGE_LAST_SEEN) ?? 0);
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Subscribe to orders + transactions realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            order_number?: string;
            total?: number;
            order_type?: string;
          };
          if (!row.id || !row.order_number) return;
          const n: Notification = {
            id: `order-${row.id}-${Date.now()}`,
            kind: "new_order",
            title: `New order ${row.order_number}`,
            detail: `${row.order_type === "dine_in" ? "Dine-in" : "Takeaway"} · ₱${Number(row.total ?? 0).toFixed(2)}`,
            href: `/admin/orders/${row.id}`,
            at: new Date().toISOString(),
          };
          setNotifs((prev) => [n, ...prev].slice(0, MAX_NOTIFS));
          toast.info(`New order: ${row.order_number}`);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            order_number?: string;
            status?: string;
          };
          const prev = payload.old as { status?: string };
          if (!row.id || row.status === prev.status) return;
          const n: Notification = {
            id: `status-${row.id}-${Date.now()}`,
            kind: "status",
            title: `${row.order_number} → ${row.status}`,
            detail: `Status changed from ${prev.status ?? "—"}`,
            href: `/admin/orders/${row.id}`,
            at: new Date().toISOString(),
          };
          setNotifs((prev2) => [n, ...prev2].slice(0, MAX_NOTIFS));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          const row = payload.new as {
            order_id?: string;
            payment_method?: string;
            amount?: number;
            status?: string;
          };
          if (!row.order_id || row.status !== "paid") return;
          const n: Notification = {
            id: `pay-${row.order_id}-${Date.now()}`,
            kind: "payment",
            title: `Payment received`,
            detail: `${row.payment_method} · ₱${Number(row.amount ?? 0).toFixed(2)}`,
            href: `/admin/orders/${row.order_id}`,
            at: new Date().toISOString(),
          };
          setNotifs((prev) => [n, ...prev].slice(0, MAX_NOTIFS));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, toast]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function markAllSeen() {
    const now = Date.now();
    setLastSeen(now);
    try {
      localStorage.setItem(STORAGE_LAST_SEEN, String(now));
    } catch {}
  }

  const unread = notifs.filter((n) => new Date(n.at).getTime() > lastSeen).length;

  function handleToggle() {
    setOpen((v) => {
      const next = !v;
      if (next) markAllSeen(); // opening counts as seeing
      return next;
    });
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--color-primary)] shadow-sm transition-all hover:bg-[var(--color-primary-50)]"
      >
        <i className="fa-solid fa-bell" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-primary)] px-4 py-3 text-white">
            <span className="flex items-center gap-2 font-semibold">
              <i className="fa-solid fa-bell" /> Notifications
            </span>
            {notifs.length > 0 && (
              <button
                onClick={() => setNotifs([])}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider hover:bg-white/20"
              >
                Clear
              </button>
            )}
          </header>
          <ul className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <li className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
                <i className="fa-solid fa-bell-slash text-2xl text-[var(--color-primary-200)]" />
                <p className="mt-2">You&apos;re all caught up.</p>
                <p className="mt-1 text-xs">
                  New orders and updates will show here in real time.
                </p>
              </li>
            ) : (
              notifs.map((n) => {
                const isUnread = new Date(n.at).getTime() > lastSeen;
                return (
                  <li
                    key={n.id}
                    className={`border-b border-[var(--color-line)] last:border-0 ${isUnread ? "bg-[var(--color-primary-50)]/50" : ""}`}
                  >
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition-colors hover:bg-[var(--color-primary-50)]"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                            n.kind === "new_order"
                              ? "bg-[var(--color-accent-50)] text-[var(--color-accent)]"
                              : n.kind === "payment"
                                ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                                : "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
                          }`}
                        >
                          <i
                            className={`fa-solid text-xs ${
                              n.kind === "new_order"
                                ? "fa-receipt"
                                : n.kind === "payment"
                                  ? "fa-credit-card"
                                  : "fa-arrow-right-arrow-left"
                            }`}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--color-primary)]">
                            {n.title}
                          </p>
                          <p className="truncate text-xs text-[var(--color-muted)]">
                            {n.detail}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                            {new Date(n.at).toLocaleTimeString("en-PH", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {isUnread && (
                          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
