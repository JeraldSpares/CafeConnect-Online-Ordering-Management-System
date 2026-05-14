import { createClient } from "@/lib/supabase/server";
import { ImportTool } from "./import-tool";

export const dynamic = "force-dynamic";

export default async function MenuImportPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6 p-8 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          <i className="fa-solid fa-file-csv" /> Bulk Import
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Import menu items from CSV
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Paste or upload a CSV and we&apos;ll create the items in one go.
          Categories are matched by name (case-insensitive) and auto-created if
          they don&apos;t exist.
        </p>
      </header>

      <section className="cc-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-info" /> Expected columns
        </h2>
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-primary-50)] p-3 text-xs text-[var(--color-text)]">
          {`name,category,price,description,image_url
Spanish Latte,Espresso,140.00,Our house espresso with brown-sugar syrup,
Matcha Iced,Cold Drinks,135.00,Hand-whisked ceremonial-grade matcha,https://...`}
        </pre>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          <strong>name</strong> and <strong>price</strong> are required.
          Description and image URL are optional. Category is optional — leave
          blank for uncategorized.
        </p>
      </section>

      <ImportTool
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
