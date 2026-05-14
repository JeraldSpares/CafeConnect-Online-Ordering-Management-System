"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    // Brief delay so fonts/CSS settle before the print dialog opens.
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-700)]"
    >
      <i className="fa-solid fa-print" /> Print / Save as PDF
    </button>
  );
}
