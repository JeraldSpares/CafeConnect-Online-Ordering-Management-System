"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium text-[var(--color-muted)]"
        >
          <i className="fa-solid fa-envelope mr-1" /> Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cc-input mt-1"
          placeholder="you@hebrewscafe.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-[var(--color-muted)]"
        >
          <i className="fa-solid fa-key mr-1" /> Password
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            type={showPw ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="cc-input !pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-primary)]"
            aria-label="Toggle password visibility"
          >
            <i className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`} />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border-l-4 border-l-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          <i className="fa-solid fa-triangle-exclamation mr-1" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full !py-2.5"
      >
        {loading ? (
          <>
            <i className="fa-solid fa-spinner fa-spin" /> Signing in…
          </>
        ) : (
          <>
            <i className="fa-solid fa-arrow-right-to-bracket" /> Sign in
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <div className="cc-bean" style={{ width: 400, height: 240, top: -80, left: -80 }} />
      <div className="cc-bean animate-float" style={{ width: 280, height: 180, bottom: -60, right: -40, animationDelay: "1s" }} />

      <div className="relative w-full max-w-sm cc-card p-8 animate-scale-in">
        <div className="text-center">
          <Link
            href="/"
            className="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-[var(--color-primary)] text-white"
          >
            <i className="fa-solid fa-mug-saucer text-2xl" />
          </Link>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
            CafeConnect
          </p>
          <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
            Staff Sign In
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Hebrew&apos;s Cafe admin portal
          </p>
        </div>

        <div className="mt-6">
          <Suspense
            fallback={
              <p className="text-sm text-[var(--color-muted)]">Loading…</p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-xs text-[var(--color-muted)]">
          <i className="fa-solid fa-shield mr-1" /> Authorized personnel only.
        </p>
      </div>
    </main>
  );
}
