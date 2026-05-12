"use client";

import { useState, useTransition } from "react";
import { createCategory, deleteCategory } from "./actions";

type Category = { id: string; name: string };

export function CategoriesSection({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="cc-card p-6">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <i className="fa-solid fa-tags text-[var(--color-accent)]" /> Categories
      </h2>

      <form
        id="cat-form"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await createCategory(formData);
            if (res?.error) setError(res.error);
            else
              (document.getElementById("cat-form") as HTMLFormElement)?.reset();
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          name="name"
          required
          placeholder="Category name (e.g. Cold Drinks)"
          className="cc-input min-w-48 flex-1 !py-1.5 text-sm"
        />
        <input
          name="sort_order"
          type="number"
          defaultValue="0"
          placeholder="Sort"
          className="cc-input w-20 !py-1.5 text-sm"
        />
        <button type="submit" disabled={pending} className="btn-primary !py-1.5 !px-4">
          {pending ? (
            <i className="fa-solid fa-spinner fa-spin" />
          ) : (
            <i className="fa-solid fa-plus" />
          )}
          Add
        </button>
        {error && (
          <span className="text-xs text-[var(--color-danger)]">{error}</span>
        )}
      </form>

      {categories.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" data-stagger>
          {categories.map((c) => (
            <li
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]"
            >
              <i className="fa-solid fa-tag text-[var(--color-accent)]" />
              {c.name}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Delete category "${c.name}"?`)) return;
                  startTransition(async () => {
                    const res = await deleteCategory(c.id);
                    if (res?.error) setError(res.error);
                  });
                }}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                aria-label={`Delete ${c.name}`}
              >
                <i className="fa-solid fa-xmark text-[10px]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
