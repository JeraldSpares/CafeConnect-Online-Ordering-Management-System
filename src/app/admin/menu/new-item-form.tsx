"use client";

import { useState, useTransition } from "react";
import { createMenuItem } from "./actions";

type Category = { id: string; name: string };

export function NewItemForm({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await createMenuItem(formData);
          if (res?.error) {
            setError(res.error);
          } else {
            (
              document.getElementById("new-item-form") as HTMLFormElement
            )?.reset();
          }
        });
      }}
      id="new-item-form"
      className="cc-card grid grid-cols-1 gap-3 p-6 md:grid-cols-5"
    >
      <div className="md:col-span-5">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <i className="fa-solid fa-plus text-[var(--color-accent)]" /> Add menu item
        </h2>
      </div>
      <div className="md:col-span-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Item name
        </label>
        <input
          name="name"
          required
          className="cc-input mt-1 !py-2 text-sm"
          placeholder="Cafe Latte"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Price (PHP)
        </label>
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          className="cc-input mt-1 !py-2 text-sm"
          placeholder="120.00"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Category
        </label>
        <select name="category_id" className="cc-input mt-1 !py-2 text-sm">
          <option value="">(none)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full !py-2"
        >
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Adding…
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus" /> Add item
            </>
          )}
        </button>
      </div>

      <div className="md:col-span-5">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Description (optional)
        </label>
        <input
          name="description"
          className="cc-input mt-1 !py-2 text-sm"
          placeholder="Espresso with steamed milk"
        />
      </div>

      <div className="md:col-span-5">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          <i className="fa-solid fa-image mr-1" /> Image URL (optional)
        </label>
        <input
          name="image_url"
          type="url"
          className="cc-input mt-1 !py-2 text-sm"
          placeholder="https://images.unsplash.com/…"
        />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Tip: search a coffee photo on{" "}
          <a
            href="https://unsplash.com/s/photos/coffee"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--color-primary)]"
          >
            Unsplash
          </a>{" "}
          and paste the direct image link.
        </p>
      </div>

      {error && (
        <p className="md:col-span-5 rounded-md border-l-4 border-l-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation mr-1" /> {error}
        </p>
      )}
    </form>
  );
}
