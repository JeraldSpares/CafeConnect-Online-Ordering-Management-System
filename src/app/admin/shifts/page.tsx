import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { ShiftToggle } from "./shift-toggle";

export const dynamic = "force-dynamic";

function formatDuration(start: string, end: string | null) {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const diff = Math.max(0, endMs - startMs);
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export default async function ShiftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: openShift }, { data: recent }] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, started_at")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("shifts")
      .select("id, user_id, started_at, ended_at, notes")
      .order("started_at", { ascending: false })
      .limit(50),
  ]);

  // Resolve profile names for the recent shifts
  const userIds = Array.from(new Set((recent ?? []).map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p] as const),
  );

  const completedToday = (recent ?? []).filter((r) => {
    if (!r.ended_at) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(r.started_at).getTime() >= today.getTime();
  });

  const totalMsToday = completedToday.reduce(
    (s, r) =>
      s +
      Math.max(
        0,
        new Date(r.ended_at!).getTime() - new Date(r.started_at).getTime(),
      ),
    0,
  );
  const totalHoursToday = (totalMsToday / 3_600_000).toFixed(1);

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-clock" /> Time Clock
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Shifts
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Clock in when you start your shift, clock out when you finish. Track
          hours worked across the team.
        </p>
      </header>

      <ShiftToggle openShiftId={openShift?.id ?? null} startedAt={openShift?.started_at ?? null} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Currently on shift"
          icon="fa-user-clock"
          value={String(
            (recent ?? []).filter((r) => !r.ended_at).length,
          )}
        />
        <Stat
          label="Shifts today"
          icon="fa-calendar-day"
          value={String(completedToday.length)}
        />
        <Stat
          label="Hours worked today"
          icon="fa-hourglass-half"
          value={`${totalHoursToday}h`}
        />
      </section>

      <section className="cc-card overflow-hidden">
        <header className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-clock-rotate-left" /> Recent shifts
          </h2>
        </header>
        {recent && recent.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-3">Staff</th>
                <th className="px-6 py-3">Started</th>
                <th className="px-6 py-3">Ended</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => {
                const p = profileById.get(s.user_id);
                const isOpen = !s.ended_at;
                return (
                  <tr
                    key={s.id}
                    className="border-t border-[var(--color-line)]"
                  >
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary)] text-white">
                          <i className="fa-solid fa-user text-xs" />
                        </span>
                        <span className="font-medium text-[var(--color-primary)]">
                          {p?.full_name ?? "—"}
                        </span>
                        {p?.role && (
                          <span className="text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
                            {p.role}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[var(--color-muted)]">
                      {formatDateTime(s.started_at)}
                    </td>
                    <td className="px-6 py-3 text-[var(--color-muted)]">
                      {isOpen ? (
                        <span className="chip bg-[var(--color-success-bg)] text-[var(--color-success)]">
                          <i className="fa-solid fa-circle text-[6px] animate-pulse" />
                          on shift
                        </span>
                      ) : (
                        formatDateTime(s.ended_at!)
                      )}
                    </td>
                    <td className="px-6 py-3 font-semibold text-[var(--color-primary)]">
                      {formatDuration(s.started_at, s.ended_at)}
                    </td>
                    <td className="px-6 py-3 text-xs text-[var(--color-muted)]">
                      {s.notes ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center">
            <i className="fa-solid fa-clock text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No shifts logged yet. Click the green button above to clock in.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="cc-card cc-card-hover p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
          <i className={`fa-solid ${icon}`} />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            {label}
          </p>
          <p className="font-display text-xl font-bold text-[var(--color-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
