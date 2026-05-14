import { peso } from "@/lib/format";

export function RevenueGoalCard({
  goal,
  earned,
}: {
  goal: number;
  earned: number;
}) {
  const pct = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;
  const remaining = Math.max(0, goal - earned);
  const size = 140;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const reached = earned >= goal;

  return (
    <div className="cc-card relative overflow-hidden p-5">
      <div className="cc-bean" style={{ width: 180, height: 120, top: -40, right: -30, opacity: 0.06 }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
            <i className="fa-solid fa-bullseye" /> Monthly Goal
          </p>
          <h2 className="font-display mt-1 text-lg font-bold text-[var(--color-primary)]">
            Revenue progress
          </h2>
        </div>
        <a
          href="/admin/settings#goal"
          className="rounded-full border border-[var(--color-line)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]"
          title="Change goal in Settings"
        >
          <i className="fa-solid fa-pen" /> edit
        </a>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={reached ? "var(--color-success)" : "var(--color-accent)"}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dasharray 0.8s ease-out" }}
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-2xl font-bold text-[var(--color-primary)]">
                {Math.round(pct)}%
              </p>
              <p className="text-[9px] uppercase tracking-widest text-[var(--color-muted)]">
                of goal
              </p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Earned this month</span>
            <span className="font-semibold text-[var(--color-primary)]">
              {peso.format(earned)}
            </span>
          </div>
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Goal</span>
            <span className="font-semibold text-[var(--color-primary)]">
              {peso.format(goal)}
            </span>
          </div>
          <div className="flex justify-between border-t border-[var(--color-line)] pt-1.5">
            <span className="font-semibold">
              {reached ? "🎉 Reached!" : "Remaining"}
            </span>
            <span
              className={`font-bold ${reached ? "text-[var(--color-success)]" : "text-[var(--color-accent)]"}`}
            >
              {reached ? "Yay!" : peso.format(remaining)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
