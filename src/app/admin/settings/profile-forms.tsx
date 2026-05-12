"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/lib/toast";
import {
  updateProfile,
  updateEmail,
  changePassword,
} from "./actions";

type Defaults = { fullName: string; phone: string; email: string };

export function ProfileForms({ defaults }: { defaults: Defaults }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ProfileInfoForm defaults={defaults} />
      <ChangeEmailForm defaultEmail={defaults.email} />
      <ChangePasswordForm />
    </div>
  );
}

function ProfileInfoForm({ defaults }: { defaults: Defaults }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await updateProfile(fd);
          if (res.error) toast.error(res.error);
          else toast.success("Profile updated.");
        })
      }
      className="cc-card p-6 lg:col-span-2"
    >
      <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <i className="fa-solid fa-id-card text-[var(--color-accent)]" /> Personal
        info
      </h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Your name shows up in receipts, the dashboard greeting, and the
        sidebar.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Full name
          </label>
          <input
            name="full_name"
            defaultValue={defaults.fullName}
            className="cc-input mt-1 !py-2 text-sm"
            placeholder="Cafe Admin"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Phone
          </label>
          <input
            name="phone"
            defaultValue={defaults.phone}
            className="cc-input mt-1 !py-2 text-sm"
            placeholder="0917…"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Saving…
            </>
          ) : (
            <>
              <i className="fa-solid fa-check" /> Save changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ChangeEmailForm({ defaultEmail }: { defaultEmail: string }) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(defaultEmail);
  const toast = useToast();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await updateEmail(fd);
          if (res.error) toast.error(res.error);
          else if (res.notice) toast.info(res.notice);
        })
      }
      className="cc-card p-6"
    >
      <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <i className="fa-solid fa-envelope text-[var(--color-accent)]" /> Sign-in
        email
      </h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Changing this address requires confirmation from the new inbox before
        it takes effect.
      </p>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cc-input mt-1 !py-2 text-sm"
        />
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending || email === defaultEmail || !email}
          className="btn-primary"
        >
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Sending…
            </>
          ) : (
            <>
              <i className="fa-solid fa-paper-plane" /> Update email
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const toast = useToast();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await changePassword(fd);
          if (res.error) toast.error(res.error);
          else {
            toast.success(res.notice ?? "Password updated.");
            (
              document.getElementById("pw-form") as HTMLFormElement
            )?.reset();
          }
        })
      }
      id="pw-form"
      className="cc-card p-6"
    >
      <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <i className="fa-solid fa-key text-[var(--color-accent)]" /> Change
        password
      </h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Use at least 8 characters. We&apos;ll sign other devices out
        automatically.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            New password
          </label>
          <div className="relative">
            <input
              name="password"
              type={show ? "text" : "password"}
              required
              minLength={8}
              className="cc-input mt-1 !py-2 !pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label="Toggle password visibility"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-primary)]"
            >
              <i className={`fa-solid ${show ? "fa-eye-slash" : "fa-eye"}`} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Confirm
          </label>
          <input
            name="confirm"
            type={show ? "text" : "password"}
            required
            minLength={8}
            className="cc-input mt-1 !py-2 text-sm"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Updating…
            </>
          ) : (
            <>
              <i className="fa-solid fa-key" /> Update password
            </>
          )}
        </button>
      </div>
    </form>
  );
}
