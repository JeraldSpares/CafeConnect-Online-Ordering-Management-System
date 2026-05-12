"use client";

import { useEffect } from "react";
import { ToastProvider } from "@/lib/toast";

function ScrollResetOnLoad() {
  useEffect(() => {
    // Prevent the browser from restoring the previous scroll position on
    // refresh — every fresh load (or refresh) starts at the very top.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ScrollResetOnLoad />
      {children}
    </ToastProvider>
  );
}
