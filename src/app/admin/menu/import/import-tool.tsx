"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { importMenuCsv, type ImportRow } from "./actions";

export function ImportTool({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const parsed = useMemo(() => {
    return parseCsv(csv);
  }, [csv]);

  const valid = parsed.rows.filter((r) => !r.error);
  const invalid = parsed.rows.filter((r) => r.error);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function submit() {
    if (valid.length === 0) {
      toast.error("Nothing valid to import.");
      return;
    }
    startTransition(async () => {
      const payload: ImportRow[] = valid.map((r) => ({
        name: r.name,
        category: r.category,
        price: r.price,
        description: r.description || undefined,
        image_url: r.image_url || undefined,
      }));
      const res = await importMenuCsv(payload);
      if (res.error) toast.error(res.error);
      else {
        toast.success(
          `Imported ${res.imported} item${res.imported === 1 ? "" : "s"}` +
            (res.categoriesCreated
              ? ` and ${res.categoriesCreated} new categor${res.categoriesCreated === 1 ? "y" : "ies"}.`
              : "."),
        );
        setCsv("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="cc-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-file-arrow-up" /> Upload or paste
        </h2>
        <div className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full text-sm text-[var(--color-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-[var(--color-primary-700)]"
          />
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={6}
            className="cc-input font-mono text-xs"
            placeholder="name,category,price,description,image_url"
          />
          {categories.length > 0 && (
            <p className="text-xs text-[var(--color-muted)]">
              <i className="fa-solid fa-circle-info mr-1" />
              Existing categories you can match:{" "}
              {categories.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>
      </section>

      {parsed.rows.length > 0 && (
        <section className="cc-card overflow-hidden">
          <header className="border-b border-[var(--color-line)] px-6 py-4">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <i className="fa-solid fa-table" /> Preview
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              <strong className="text-[var(--color-success)]">
                {valid.length} valid
              </strong>{" "}
              ·{" "}
              <strong className="text-[var(--color-danger)]">
                {invalid.length} skipped
              </strong>
            </p>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-50)] text-left text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
              <tr>
                <th className="px-6 py-2">Row</th>
                <th className="px-6 py-2">Name</th>
                <th className="px-6 py-2">Category</th>
                <th className="px-6 py-2">Price</th>
                <th className="px-6 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--color-line)]">
                  <td className="px-6 py-2 text-[var(--color-muted)]">
                    {i + 2}
                  </td>
                  <td className="px-6 py-2">{r.name || "—"}</td>
                  <td className="px-6 py-2 text-[var(--color-muted)]">
                    {r.category || "—"}
                  </td>
                  <td className="px-6 py-2">
                    {Number.isFinite(r.price) ? `₱${r.price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-6 py-2">
                    {r.error ? (
                      <span className="chip bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                        {r.error}
                      </span>
                    ) : (
                      <span className="chip bg-[var(--color-success-bg)] text-[var(--color-success)]">
                        ok
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="flex justify-end">
        <button
          disabled={pending || valid.length === 0}
          onClick={submit}
          className="btn-primary"
        >
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Importing…
            </>
          ) : (
            <>
              <i className="fa-solid fa-file-import" /> Import {valid.length} item
              {valid.length === 1 ? "" : "s"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

type ParsedRow = {
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  error?: string;
};

function parseCsv(input: string): { rows: ParsedRow[] } {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [] };

  // Skip header if present
  const first = splitLine(lines[0]);
  const looksLikeHeader =
    first[0]?.toLowerCase() === "name" && first.includes("price");
  const dataLines = looksLikeHeader ? lines.slice(1) : lines;

  return {
    rows: dataLines.map((line) => {
      const cols = splitLine(line);
      const [name, category, priceStr, description, image_url] = cols;
      const price = Number(priceStr);

      const row: ParsedRow = {
        name: (name ?? "").trim(),
        category: (category ?? "").trim(),
        price,
        description: (description ?? "").trim(),
        image_url: (image_url ?? "").trim(),
      };

      if (!row.name) row.error = "missing name";
      else if (Number.isNaN(price)) row.error = "bad price";
      else if (price < 0) row.error = "negative price";

      return row;
    }),
  };
}

function splitLine(line: string): string[] {
  // Simple CSV splitter — handles quoted fields with commas inside
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        buf += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  out.push(buf);
  return out;
}
