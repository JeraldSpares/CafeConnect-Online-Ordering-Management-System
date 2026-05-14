"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { endShift, startShift } from "./actions";

export function ShiftToggle({
  openShiftId,
  startedAt,
}: {
  openShiftId: string | null;
  startedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!openShiftId) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [openShiftId]);

  function formatElapsed() {
    if (!startedAt) return "00:00:00";
    const diff = Math.max(0, now - new Date(startedAt).getTime());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  return (
    <section className="cc-card relative overflow-hidden p-6">
      <div
        className="cc-bean"
        style={{ width: 240, height: 160, top: -40, right: -30, opacity: 0.08 }}
      />
      {openShiftId ? (
        <div className="flex flex-wrap items-center gap-5">
          <div
            className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]"
          >
            <i className="fa-solid fa-stopwatch animate-pulse text-3xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-[var(--color-success)]">
              On shift
            </p>
            <p className="font-display font-mono text-3xl font-bold tracking-widest text-[var(--color-primary)]">
              {formatElapsed()}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Started{" "}
              {startedAt
                ? new Date(startedAt).toLocaleTimeString("en-PH", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-end gap-2">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="End-of-shift notes (optional)"
              className="cc-input flex-1 min-w-48 !py-2 text-sm"
            />
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await endShift(openShiftId, notes);
                  if (res.error) toast.error(res.error);
                  else {
                    toast.success("Shift ended.");
                    setNotes("");
                    router.refresh();
                  }
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-danger)] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60"
            >
              {pending ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> Ending…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-stop" /> Clock out
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
            <i className="fa-solid fa-clock text-3xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
              Not on shift
            </p>
            <p className="font-display text-2xl font-bold text-[var(--color-primary)]">
              Ready to clock in?
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              We&apos;ll start counting hours from the moment you press the
              button.
            </p>
          </div>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await startShift();
                if (res.error) toast.error(res.error);
                else {
                  toast.success("Clocked in!");
                  router.refresh();
                }
              })
            }
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-success)] px-6 py-3 text-base font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60"
          >
            {pending ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Starting…
              </>
            ) : (
              <>
                <i className="fa-solid fa-play" /> Clock in
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
