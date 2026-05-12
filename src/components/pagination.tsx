import Link from "next/link";

/**
 * URL-driven pagination control.
 *
 * The caller passes the current pathname and *all* current search params
 * so we preserve filters/sort while flipping pages. Renders Prev / page
 * numbers (with "…" gaps) / Next plus a "X–Y of Z" range indicator.
 */
export function Pagination({
  pathname,
  searchParams,
  page,
  perPage,
  total,
  pageKey = "page",
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  perPage: number;
  total: number;
  pageKey?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1 && total <= perPage) {
    return (
      <div className="px-6 py-3 text-xs text-[var(--color-muted)]">
        {total} record{total === 1 ? "" : "s"}
      </div>
    );
  }

  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && k !== pageKey) params.set(k, v);
    });
    if (p > 1) params.set(pageKey, String(p));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  // Build the page list with ellipsis: 1 … (page-1) page (page+1) … last
  const numbers: (number | "ellipsis")[] = [];
  const push = (n: number) => {
    if (n >= 1 && n <= totalPages && !numbers.includes(n)) numbers.push(n);
  };
  push(1);
  if (page - 1 > 2) numbers.push("ellipsis");
  for (let n = page - 1; n <= page + 1; n++) push(n);
  if (page + 1 < totalPages - 1) numbers.push("ellipsis");
  push(totalPages);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] px-6 py-3 text-xs"
      aria-label="Pagination"
    >
      <span className="text-[var(--color-muted)]">
        Showing <strong className="text-[var(--color-primary)]">{start}</strong>
        –<strong className="text-[var(--color-primary)]">{end}</strong> of{" "}
        <strong className="text-[var(--color-primary)]">{total}</strong>
      </span>

      <div className="flex items-center gap-1">
        <PageLink
          href={hrefFor(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <i className="fa-solid fa-chevron-left" />
        </PageLink>
        {numbers.map((n, i) =>
          n === "ellipsis" ? (
            <span
              key={`e-${i}`}
              className="px-2 text-[var(--color-muted)]"
              aria-hidden
            >
              …
            </span>
          ) : (
            <PageLink
              key={n}
              href={hrefFor(n)}
              active={n === page}
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </PageLink>
          ),
        )}
        <PageLink
          href={hrefFor(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <i className="fa-solid fa-chevron-right" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  ...aria
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page";
}) {
  const base =
    "grid h-8 min-w-8 place-items-center rounded-md border px-2 text-xs font-semibold transition-colors";
  if (disabled) {
    return (
      <span
        {...aria}
        className={`${base} cursor-not-allowed border-[var(--color-line)] bg-white text-[var(--color-muted)]/40`}
        aria-disabled
      >
        {children}
      </span>
    );
  }
  if (active) {
    return (
      <span
        {...aria}
        className={`${base} border-[var(--color-primary)] bg-[var(--color-primary)] text-white`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      {...aria}
      className={`${base} border-[var(--color-line)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]`}
    >
      {children}
    </Link>
  );
}

/**
 * Sortable table header cell. Clicking toggles asc/desc on its column;
 * clicking a different column resets to asc.
 */
export function SortableTH({
  label,
  sortKey,
  current,
  dir,
  pathname,
  searchParams,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: string;
  current: string | undefined;
  dir: "asc" | "desc" | undefined;
  pathname: string;
  searchParams: Record<string, string | undefined>;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const isActive = current === sortKey;
  const nextDir = isActive && dir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (
      v !== undefined &&
      v !== "" &&
      k !== "sort" &&
      k !== "dir" &&
      k !== "page"
    ) {
      params.set(k, v);
    }
  });
  params.set("sort", sortKey);
  params.set("dir", nextDir);
  const href = `${pathname}?${params.toString()}`;

  const arrow = isActive ? (
    <i
      className={`fa-solid ml-1 text-[10px] ${dir === "asc" ? "fa-arrow-up" : "fa-arrow-down"}`}
    />
  ) : (
    <i className="fa-solid fa-sort ml-1 text-[10px] opacity-30" />
  );

  return (
    <th
      className={`px-6 py-3 text-${align} text-[11px] uppercase tracking-wider ${className}`}
    >
      <Link
        href={href}
        className={`inline-flex items-center gap-0.5 transition-colors ${
          isActive
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-primary)]/80 hover:text-[var(--color-primary)]"
        }`}
      >
        {label}
        {arrow}
      </Link>
    </th>
  );
}

/**
 * Parse common pagination / sort / search params from awaited searchParams.
 */
export function parseTableParams<T extends string>(
  sp: Record<string, string | string[] | undefined>,
  allowedSort: readonly T[],
  defaults: { sort: T; dir?: "asc" | "desc"; perPage?: number },
): {
  page: number;
  perPage: number;
  sort: T;
  dir: "asc" | "desc";
  q: string;
  raw: Record<string, string | undefined>;
} {
  const get = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const page = Math.max(1, Number(get("page")) || 1);
  const perPage = Math.min(
    100,
    Math.max(5, Number(get("per")) || defaults.perPage || 20),
  );
  const rawSort = get("sort");
  const sort = (allowedSort.includes(rawSort as T) ? rawSort : defaults.sort) as T;
  const rawDir = get("dir");
  const dir: "asc" | "desc" =
    rawDir === "asc" || rawDir === "desc"
      ? rawDir
      : defaults.dir ?? "desc";
  const q = (get("q") ?? "").trim();

  const raw: Record<string, string | undefined> = {};
  Object.entries(sp).forEach(([k, v]) => {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined && val !== "") raw[k] = val;
  });

  return { page, perPage, sort, dir, q, raw };
}
