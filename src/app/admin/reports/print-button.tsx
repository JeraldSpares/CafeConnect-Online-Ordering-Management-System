"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[var(--color-primary-700)]"
    >
      <i className="fa-solid fa-file-pdf" /> Save as PDF
    </button>
  );
}
