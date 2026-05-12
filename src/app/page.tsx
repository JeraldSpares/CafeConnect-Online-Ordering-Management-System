import Link from "next/link";
import Image from "next/image";

// Curated coffee photos from Unsplash (public, no auth needed)
const HERO_IMG =
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&auto=format&fit=crop&q=80";
const SIDE_IMG_1 =
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80";
const SIDE_IMG_2 =
  "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80";

const FEATURES = [
  { icon: "fa-bolt", title: "Lightning fast", body: "Skip the line. Order ahead and pick up when ready." },
  { icon: "fa-mobile-screen", title: "Order anywhere", body: "Works on your phone, laptop, or tablet — no app to install." },
  { icon: "fa-receipt", title: "Real-time updates", body: "Live status from preparing to ready for pickup." },
];

const STATS = [
  { value: "8+", label: "Signature drinks", icon: "fa-mug-hot" },
  { value: "5★", label: "Roasted fresh daily", icon: "fa-star" },
  { value: "<3min", label: "Average wait time", icon: "fa-stopwatch" },
];

const TESTIMONIALS = [
  {
    name: "Maria, Cabanatuan",
    quote: "Sobrang bilis mag-order, ready na agad pag-dating ko sa tindahan!",
    icon: "fa-user-graduate",
  },
  {
    name: "Jasper, Student",
    quote: "Ang sarap ng latte. Lagi akong nag-order online tuwing exam week.",
    icon: "fa-user-tie",
  },
  {
    name: "Carla, Office worker",
    quote: "I love that I can track my order in real time. Perfect for busy mornings.",
    icon: "fa-user-nurse",
  },
];

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Decorative blobs */}
      <div className="cc-bean" style={{ width: 320, height: 200, top: -80, left: -60 }} />
      <div className="cc-bean animate-float" style={{ width: 220, height: 140, top: 120, right: -40, animationDelay: "1s" }} />

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
            <i className="fa-solid fa-leaf" /> Freshly Brewed Daily
          </span>
          <h1 className="font-display mt-5 text-5xl font-bold leading-[1.05] text-[var(--color-primary)] sm:text-6xl lg:text-7xl">
            A warm cup.
            <br />
            <span className="bg-gradient-to-r from-[var(--color-accent)] to-amber-600 bg-clip-text text-transparent">
              Without the wait.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
            Hebrew&apos;s Cafe meets the digital counter. Browse our menu,
            customize your drink, and pick it up when it&apos;s ready — your
            morning, simplified.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/menu" className="btn-primary !px-6 !py-3 text-base">
              <i className="fa-solid fa-cup-hot" />
              Order Now
            </Link>
            <Link href="/track" className="btn-ghost !px-5 !py-2.5">
              <i className="fa-solid fa-magnifying-glass" />
              Track Order
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-3 text-center">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="cc-card cc-card-hover animate-fade-up p-3"
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              >
                <i className={`fa-solid ${s.icon} text-[var(--color-accent)]`} />
                <p className="font-display mt-1 text-xl font-bold text-[var(--color-primary)]">
                  {s.value}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo collage */}
        <div className="relative h-[480px] animate-scale-in">
          {/* Main hero image */}
          <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] shadow-[0_30px_80px_-20px_rgba(20,39,31,0.45)]">
            <Image
              src={HERO_IMG}
              alt="Freshly brewed latte at Hebrew's Cafe"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/40 via-transparent to-transparent" />
            {/* Bottom info chip */}
            <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 backdrop-blur shadow-lg">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
                <i className="fa-solid fa-mug-hot" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-[var(--color-primary)] truncate">
                  Today&apos;s Pour: House Blend
                </p>
                <p className="text-xs text-[var(--color-muted)] truncate">
                  Smooth, balanced, with notes of caramel
                </p>
              </div>
              <span className="font-display text-lg font-bold text-[var(--color-accent)]">
                ₱85
              </span>
            </div>
          </div>

          {/* Floating side images */}
          <div className="absolute -right-4 -top-6 hidden h-32 w-32 overflow-hidden rounded-2xl shadow-xl ring-4 ring-white animate-float sm:block">
            <Image
              src={SIDE_IMG_1}
              alt="Espresso pour"
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>
          <div
            className="absolute -bottom-6 -left-6 hidden h-28 w-28 overflow-hidden rounded-2xl shadow-xl ring-4 ring-white animate-float sm:block"
            style={{ animationDelay: "1.5s" }}
          >
            <Image
              src={SIDE_IMG_2}
              alt="Pastry"
              fill
              sizes="140px"
              className="object-cover"
            />
          </div>

          {/* Floating chips */}
          <div className="absolute -left-2 top-6 rotate-[-4deg] rounded-2xl bg-white px-3 py-2 shadow-lg animate-float">
            <span className="font-display flex items-center gap-1 text-xs font-bold text-[var(--color-primary)]">
              <i className="fa-solid fa-star text-[var(--color-accent)]" /> 4.9 Rated
            </span>
          </div>
        </div>
      </section>

      {/* Features ribbon */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
        <div data-stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="cc-card cc-card-hover p-6">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
                <i className={`fa-solid ${f.icon} text-lg`} />
              </span>
              <h3 className="font-display mt-4 text-lg font-bold text-[var(--color-primary)]">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
        <div className="text-center">
          <span className="chip bg-[var(--color-primary-50)] text-[var(--color-primary)]">
            <i className="fa-solid fa-quote-left" /> Words from regulars
          </span>
          <h2 className="font-display mt-3 text-3xl font-bold text-[var(--color-primary)] sm:text-4xl">
            What they&apos;re saying
          </h2>
        </div>
        <div
          data-stagger
          className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="cc-card cc-card-hover p-6"
            >
              <i className="fa-solid fa-quote-left text-2xl text-[var(--color-accent)]/40" />
              <blockquote className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
                {t.quote}
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-[var(--color-line)] pt-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
                  <i className={`fa-solid ${t.icon}`} />
                </span>
                <div>
                  <p className="font-display font-bold text-[var(--color-primary)]">
                    {t.name}
                  </p>
                  <div className="flex gap-0.5 text-[var(--color-accent)] text-xs">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className="fa-solid fa-star" />
                    ))}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="relative z-10 mx-auto mb-12 w-full max-w-6xl px-6">
        <div className="cc-card relative overflow-hidden bg-[var(--color-primary)] p-10 text-center text-white sm:p-14">
          <div className="cc-bean" style={{ width: 280, height: 180, top: -60, right: -40, opacity: 0.15 }} />
          <div className="cc-bean" style={{ width: 200, height: 140, bottom: -50, left: -30, opacity: 0.15 }} />
          <i className="fa-solid fa-mug-saucer text-4xl text-[var(--color-accent)] animate-float" />
          <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
            Ready for your daily cup?
          </h2>
          <p className="mt-2 text-white/80">
            Order now. Pick up in minutes. Made fresh, every time.
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-bold text-[var(--color-primary)] transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            <i className="fa-solid fa-cup-hot" /> Browse Menu
            <i className="fa-solid fa-arrow-right" />
          </Link>
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
