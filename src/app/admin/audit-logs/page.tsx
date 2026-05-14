import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Pagination, parseTableParams } from "@/components/pagination";

export const dynamic = "force-dynamic";

type LogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const ENTITY_ICONS: Record<string, string> = {
  order: "fa-receipt",
  payment: "fa-credit-card",
  menu_item: "fa-mug-saucer",
  inventory_item: "fa-box",
  profile: "fa-user",
};

const ACTION_TINT: Record<string, string> = {
  status_changed:
    "bg-blue-50 text-blue-800",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  recorded: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  created: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
  deleted: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  hidden: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
  shown: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  restock: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  wastage: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  adjustment: "bg-[var(--color-accent-50)] text-[var(--color-accent)]",
};

function actionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/\./g, " · ");
}

function actionTint(action: string) {
  const key = action.split(".").at(-1) ?? "";
  return ACTION_TINT[key] ?? "bg-[var(--color-primary-50)] text-[var(--color-primary)]";
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, perPage, raw } = parseTableParams(sp, ["created_at"] as const, {
    sort: "created_at",
    dir: "desc",
    perPage: 25,
  });
  const entityFilter = typeof sp.entity === "string" ? sp.entity : "all";

  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (entityFilter !== "all") {
    query = query.eq("entity_type", entityFilter) as typeof query;
  }

  const { data, count, error } = await query;
  const tableMissing =
    !!error &&
    (error.code === "42P01" ||
      error.message?.toLowerCase().includes("relation") ||
      error.message?.toLowerCase().includes("does not exist"));

  if (tableMissing) {
    return (
      <div className="space-y-6 p-8 animate-fade-up">
        <header>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            <i className="fa-solid fa-shield-halved" /> Audit Trail
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
            Audit logs
          </h1>
        </header>
        <section className="cc-card flex items-start gap-3 border-l-4 border-l-[var(--color-accent)] p-6">
          <i className="fa-solid fa-circle-info mt-1 text-2xl text-[var(--color-accent)]" />
          <div>
            <p className="font-semibold text-[var(--color-primary)]">
              Audit logs aren&apos;t set up yet
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Run the migration in <code className="rounded bg-[var(--color-primary-50)] px-1.5 py-0.5 text-xs font-mono">supabase/migrations/audit_logs.sql</code>{" "}
              in your Supabase SQL editor. Once that runs, every staff
              action (status change, payment, menu edit, inventory move) is
              recorded here automatically.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const logs = (data ?? []) as unknown as LogRow[];
  const total = count ?? 0;

  const entityCounts = new Map<string, number>();
  for (const l of logs) {
    entityCounts.set(l.entity_type, (entityCounts.get(l.entity_type) ?? 0) + 1);
  }

  const filterChips = [
    { key: "all", label: "All", icon: "fa-layer-group" },
    { key: "order", label: "Orders", icon: "fa-receipt" },
    { key: "menu_item", label: "Menu", icon: "fa-mug-saucer" },
    { key: "inventory_item", label: "Inventory", icon: "fa-box" },
    { key: "profile", label: "Profile", icon: "fa-user" },
  ];

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-shield-halved" /> Audit Trail
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Audit logs
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Who did what, when. Records of every staff action across the
          system.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {filterChips.map((c) => {
          const active = entityFilter === c.key;
          const params = new URLSearchParams();
          Object.entries(raw).forEach(([k, v]) => {
            if (v && k !== "entity" && k !== "page") params.set(k, v);
          });
          if (c.key !== "all") params.set("entity", c.key);
          const qs = params.toString();
          return (
            <Link
              key={c.key}
              href={`/admin/audit-logs${qs ? `?${qs}` : ""}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-md"
                  : "border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
              }`}
            >
              <i className={`fa-solid ${c.icon}`} />
              {c.label}
            </Link>
          );
        })}
      </nav>

      <section className="cc-card overflow-hidden">
        {logs.length > 0 ? (
          <>
            <ul className="divide-y divide-[var(--color-line)]" data-stagger>
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-[var(--color-primary-50)]/40"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                    <i
                      className={`fa-solid ${
                        ENTITY_ICONS[log.entity_type] ?? "fa-circle-info"
                      }`}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={`chip ${actionTint(log.action)}`}
                      >
                        {actionLabel(log.action)}
                      </span>
                      {log.entity_label && (
                        <span className="font-mono text-xs text-[var(--color-primary)]">
                          {log.entity_label}
                        </span>
                      )}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {Object.entries(log.metadata)
                          .map(
                            ([k, v]) =>
                              `${k.replace(/_/g, " ")}: ${
                                v === null
                                  ? "—"
                                  : typeof v === "object"
                                    ? JSON.stringify(v)
                                    : String(v)
                              }`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      <i className="fa-solid fa-user-shield mr-1" />
                      {log.actor_name ?? "—"}{" "}
                      {log.actor_role && (
                        <span className="opacity-60">({log.actor_role})</span>
                      )}{" "}
                      · <i className="fa-solid fa-clock mx-1" />
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                  {log.entity_type === "order" && log.entity_id && (
                    <Link
                      href={`/admin/orders/${log.entity_id}`}
                      className="shrink-0 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                    >
                      View →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <Pagination
              pathname="/admin/audit-logs"
              searchParams={raw}
              page={page}
              perPage={perPage}
              total={total}
            />
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <i className="fa-solid fa-shield text-4xl text-[var(--color-primary-200)]" />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No audit entries yet for this filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
