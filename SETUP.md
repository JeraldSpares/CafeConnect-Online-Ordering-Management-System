# CafeConnect — Setup Guide

CafeConnect is a Next.js 16 + Supabase + Tailwind 4 stack. The customer-facing
ordering site and the admin portal both run from the same app.

## 1. Prerequisites

- Node.js 20+ (tested on 24)
- A free Supabase project
- (Optional) A free Resend account for email notifications

## 2. Install + Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

## 3. Environment Variables

Create `.env.local` at the project root:

```env
# --- Required: Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# --- Optional: Email notifications via Resend ---
# Sign up free at https://resend.com → API Keys → "Create API Key"
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx

# The sender address. While testing, you may use the default Resend
# domain shown below. For production, verify your own domain in Resend
# and replace this with something like "Hebrew's Cafe <orders@yourdomain.com>".
EMAIL_FROM=CafeConnect <onboarding@resend.dev>

# Where new-order notifications are sent (typically the café owner).
ADMIN_EMAIL=owner@example.com
```

If `RESEND_API_KEY` is missing or empty, emails are **skipped silently** (logged
to the server console). The app keeps working — there is no hard dependency.

### Resend free-tier note

The Resend free tier sends from `onboarding@resend.dev` but only delivers
to the email address registered with your Resend account. To send to any
customer, verify your own sending domain in Resend (5 minutes, just DNS).

## 4. Supabase Realtime (for the live orders queue)

The admin orders page subscribes to `postgres_changes`. Enable the publication
once in the Supabase SQL editor:

```sql
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.transactions;
```

You only need to run this once per Supabase project.

## 5. Admin login

A seeded admin user exists in the schema (`admin@cafeconnect.local` / `CafeConnect2026!`).
You can change credentials via the Supabase dashboard → Auth.

## 6. Adding menu item photos

In the admin → Menu page, paste a direct image URL when creating an item
(e.g. from [Unsplash](https://unsplash.com/s/photos/coffee)). The customer
menu card will use the photo instead of the default icon disc.

## 7. Email events that fire

| Event                                  | Recipient | When                                |
| -------------------------------------- | --------- | ----------------------------------- |
| Order placed                           | Customer  | On checkout (if email provided)     |
| New order                              | Admin     | On checkout (always)                |
| Order ready                            | Customer  | When staff marks "Mark ready"       |
| Order completed (thank-you)            | Customer  | When staff marks "Mark completed"   |
