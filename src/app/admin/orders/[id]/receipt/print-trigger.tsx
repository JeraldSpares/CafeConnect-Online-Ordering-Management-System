"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    // Slight delay so fonts/CSS settle before the print dialog.
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="btn-primary !py-1.5 !px-3 text-xs"
    >
      <i className="fa-solid fa-print" /> Print
    </button>
  );
}
