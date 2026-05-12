import Link from "next/link";
import { CartProvider } from "@/lib/cart";
import { CartIndicator } from "./cart-indicator";
import { BrandLogo } from "@/components/brand-logo";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link
              href="/"
              className="flex items-center gap-3 text-[var(--color-primary)]"
            >
              <BrandLogo size={40} priority />
              <span>
                <span className="block text-[9px] uppercase tracking-widest text-[var(--color-accent)]">
                  Hebrews Kape
                </span>
                <span className="font-display block text-lg font-bold leading-tight tracking-tight">
                  CafeConnect
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/menu"
                className="rounded-full px-4 py-2 font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-50)] transition-colors"
              >
                <i className="fa-solid fa-utensils mr-1.5" /> Menu
              </Link>
              <Link
                href="/track"
                className="rounded-full px-4 py-2 font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-50)] transition-colors"
              >
                <i className="fa-solid fa-magnifying-glass mr-1.5" /> Track
              </Link>
              <CartIndicator />
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>

        <footer className="border-t border-[var(--color-line)] bg-white/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-xs text-[var(--color-muted)]">
            <div className="flex items-center gap-2">
              <BrandLogo size={20} ring={false} />
              <span>© {new Date().getFullYear()} Hebrews Kape</span>
            </div>
            <span>
              Powered by{" "}
              <strong className="text-[var(--color-primary)]">CafeConnect</strong>
            </span>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
