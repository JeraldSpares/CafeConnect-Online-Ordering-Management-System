"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, "success"),
      error: (m) => toast(m, "error"),
      info: (m) => toast(m, "info"),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 bg-white px-4 py-3 shadow-lg animate-slide-in ${
              t.kind === "success"
                ? "border-l-[var(--color-success)]"
                : t.kind === "error"
                  ? "border-l-[var(--color-danger)]"
                  : "border-l-[var(--color-primary)]"
            }`}
            role="status"
          >
            <i
              className={`fa-solid mt-0.5 text-lg ${
                t.kind === "success"
                  ? "fa-circle-check text-[var(--color-success)]"
                  : t.kind === "error"
                    ? "fa-circle-exclamation text-[var(--color-danger)]"
                    : "fa-circle-info text-[var(--color-primary)]"
              }`}
            />
            <p className="flex-1 text-sm text-[var(--color-text)]">
              {t.message}
            </p>
            <button
              onClick={() =>
                setItems((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
              aria-label="Dismiss"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
