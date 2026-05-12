import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Decorative blobs */}
      <div className="cc-bean" style={{ width: 320, height: 200, top: -80, left: -60 }} />
      <div className="cc-bean animate-float" style={{ width: 220, height: 140, top: 120, right: -40, animationDelay: "1s" }} />
      <div className="cc-bean" style={{ width: 480, height: 300, bottom: -140, left: "30%" }} />

      {/* Top brand strip */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-[var(--color-primary)]">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary)] text-white">
            <i className="fa-solid fa-mug-saucer" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            Hebrew&apos;s Cafe
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/menu" className="btn-ghost text-xs">
            <i className="fa-solid fa-utensils" /> Menu
          </Link>
          <Link href="/login" className="btn-primary text-xs">
            <i className="fa-solid fa-user-shield" /> Staff
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-6 py-10 lg:grid-cols-2">
        <div className="animate-fade-up">
          <span className="chip bg-[var(--color-accent-50)] text-[var(--color-accent)]">
            <i className="fa-solid fa-leaf" /> Freshly Brewed
          </span>
          <h1 className="font-display mt-5 text-5xl font-bold leading-tight text-[var(--color-primary)] sm:text-6xl">
            Order your favorite cup.
            <br />
            <span className="text-[var(--color-accent)]">Skip the line.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-muted)]">
            CafeConnect lets you browse the menu, customize your drink, and
            pay at the counter — all without waiting. Crafted for Hebrew&apos;s
            Cafe, designed for you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/menu" className="btn-primary">
              <i className="fa-solid fa-cup-hot" />
              Order Now
            </Link>
            <Link href="/track" className="btn-ghost">
              <i className="fa-solid fa-magnifying-glass" />
              Track Order
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <Feature icon="fa-bolt"          label="Fast checkout" />
            <Feature icon="fa-mobile-screen" label="Order anywhere" />
            <Feature icon="fa-receipt"       label="Real-time updates" />
          </div>
        </div>

        {/* Cup illustration */}
        <div className="relative flex justify-center animate-scale-in">
          <div className="relative">
            {/* Outer ring */}
            <div className="absolute inset-0 -m-8 rounded-full border-2 border-dashed border-[var(--color-primary-200)] animate-spin-slow" />
            {/* Cup disc */}
            <div className="relative grid h-72 w-72 place-items-center rounded-full bg-[var(--color-primary)] shadow-[0_24px_60px_-20px_rgba(20,39,31,0.5)] sm:h-80 sm:w-80">
              {/* Steam */}
              <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2">
                <span className="absolute block h-6 w-2 rounded-full bg-white/40 blur-sm" style={{ animation: "steam 2.4s infinite ease-out" }} />
                <span className="absolute block h-6 w-2 rounded-full bg-white/30 blur-sm" style={{ animation: "steam 2.4s infinite ease-out", animationDelay: ".7s", left: 18 }} />
                <span className="absolute block h-6 w-2 rounded-full bg-white/30 blur-sm" style={{ animation: "steam 2.4s infinite ease-out", animationDelay: "1.3s", left: -18 }} />
              </div>
              <i className="fa-solid fa-mug-hot text-[140px] text-[var(--color-accent)]" />
            </div>
            {/* Floating chips */}
            <div className="absolute -right-6 top-6 rotate-6 rounded-2xl bg-white px-4 py-2 shadow-lg animate-float">
              <span className="font-display text-sm font-bold text-[var(--color-primary)]">
                <i className="fa-solid fa-star text-[var(--color-accent)]" /> Top Rated
              </span>
            </div>
            <div className="absolute -bottom-4 -left-6 -rotate-6 rounded-2xl bg-white px-4 py-2 shadow-lg animate-float" style={{ animationDelay: "1.2s" }}>
              <span className="font-display text-sm font-bold text-[var(--color-primary)]">
                <i className="fa-solid fa-coffee text-[var(--color-accent)]" /> Fresh Roast
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--color-line)] bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-xs text-[var(--color-muted)]">
          <span>© {new Date().getFullYear()} Hebrew&apos;s Cafe</span>
          <span className="flex items-center gap-1">
            Powered by <strong className="text-[var(--color-primary)]">CafeConnect</strong>
          </span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="cc-card cc-card-hover p-3">
      <span className="grid h-8 w-8 mx-auto place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
        <i className={`fa-solid ${icon}`} />
      </span>
      <p className="mt-2 text-xs font-medium text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
