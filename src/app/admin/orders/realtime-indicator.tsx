"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast";

export function RealtimeIndicator() {
  const router = useRouter();
  const toast = useToast();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const orderNumber =
            (payload.new as { order_number?: string } | null)?.order_number ?? "";
          toast.success(`New order received: ${orderNumber}`);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        () => router.refresh(),
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, toast]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
        connected
          ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
          : "bg-[var(--color-line)] text-[var(--color-muted)]"
      }`}
      title={connected ? "Realtime connected" : "Connecting…"}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          connected ? "bg-[var(--color-success)] animate-pulse-ring" : "bg-[var(--color-muted)]"
        }`}
      />
      {connected ? "Live" : "Connecting"}
    </span>
  );
}
