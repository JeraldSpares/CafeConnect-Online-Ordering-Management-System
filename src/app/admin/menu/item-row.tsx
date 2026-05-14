"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "./actions";
import { peso } from "@/lib/format";
import { useToast } from "@/lib/toast";

type Props = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  description: string | null;
};

export function ItemRow({ id, name, price, isAvailable, description }: Props) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <tr className="border-t border-[var(--color-line)] transition-colors hover:bg-[var(--color-primary-50)]/40">
      <td className="px-6 py-3 font-medium text-[var(--color-primary)]">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
            <i className="fa-solid fa-mug-saucer text-xs" />
          </span>
          {name}
        </span>
      </td>
      <td className="px-6 py-3 text-[var(--color-muted)]">{description ?? "—"}</td>
      <td className="px-6 py-3 font-semibold">{peso.format(Number(price))}</td>
      <td className="px-6 py-3">
        <span
          className={`chip ${
            isAvailable
              ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
              : "bg-[var(--color-accent-50)] text-[var(--color-accent)]"
          }`}
        >
          <i
            className={`fa-solid ${isAvailable ? "fa-circle-check" : "fa-eye-slash"}`}
          />
          {isAvailable ? "Available" : "Hidden"}
        </span>
      </td>
      <td className="px-6 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/menu/${id}`}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-50)]"
          >
            <i className="fa-solid fa-receipt" />
            Recipe
          </Link>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await toggleMenuItemAvailability(id, !isAvailable);
                if (res?.error) toast.error(res.error);
                else
                  toast.success(
                    `${name} is now ${!isAvailable ? "available" : "hidden"}.`,
                  );
              })
            }
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-50)] disabled:opacity-60"
          >
            <i
              className={`fa-solid ${isAvailable ? "fa-eye-slash" : "fa-eye"}`}
            />
            {isAvailable ? "Hide" : "Show"}
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete "${name}"?`)) return;
              startTransition(async () => {
                const res = await deleteMenuItem(id);
                if (res?.error) toast.error(res.error);
                else toast.success(`${name} deleted.`);
              });
            }}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-danger)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-bg)] disabled:opacity-60"
          >
            <i className="fa-solid fa-trash" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
