"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "cafeconnect.cart.v1";

export type CartLine = {
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  setQty: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const add = useCallback<CartContextValue["add"]>((line) => {
    const qty = line.quantity ?? 1;
    setLines((prev) => {
      const existing = prev.find((l) => l.menu_item_id === line.menu_item_id);
      if (existing) {
        return prev.map((l) =>
          l.menu_item_id === line.menu_item_id
            ? { ...l, quantity: l.quantity + qty }
            : l,
        );
      }
      return [
        ...prev,
        {
          menu_item_id: line.menu_item_id,
          name: line.name,
          unit_price: line.unit_price,
          quantity: qty,
        },
      ];
    });
  }, []);

  const setQty = useCallback((menuItemId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.menu_item_id !== menuItemId)
        : prev.map((l) =>
            l.menu_item_id === menuItemId ? { ...l, quantity } : l,
          ),
    );
  }, []);

  const remove = useCallback((menuItemId: string) => {
    setLines((prev) => prev.filter((l) => l.menu_item_id !== menuItemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce(
      (sum, l) => sum + l.unit_price * l.quantity,
      0,
    );
    return { lines, itemCount, subtotal, add, setQty, remove, clear };
  }, [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
