import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <div className="cc-bean" style={{ width: 320, height: 200, top: -60, left: -50 }} />
      <div className="cc-bean animate-float" style={{ width: 240, height: 160, bottom: -50, right: -40, animationDelay: "1s" }} />

      <div className="relative w-full max-w-md cc-card p-10 text-center animate-scale-in">
        <div className="mx-auto inline-block animate-float">
          <BrandLogo size={88} glow shape="rounded" />
        </div>
        <p className="mt-5 text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
          Error 404
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
          Cup not found
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          The page you&apos;re looking for is brewing somewhere else.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            <i className="fa-solid fa-house" /> Home
          </Link>
          <Link href="/menu" className="btn-ghost">
            <i className="fa-solid fa-utensils" /> View Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
