# CafeConnect — Supabase migrations

Run these files **in numeric order** in the **Supabase SQL Editor**
(Dashboard → SQL Editor → New query → paste → **Run**).

| # | File | What it does |
|---|------|--------------|
| 01 | `01_init_schema.sql` | All tables (profiles, categories, menu_items, inventory, orders, customers, transactions) + triggers + `is_staff()` helper |
| 02 | `02_rls_policies.sql` | Row Level Security policies — public read on menu, staff-only on the rest |
| 03 | `03_rpcs.sql` | `place_order()`, `get_order_by_number()`, `sales_summary()` |
| 04 | `04_seed_demo.sql` | Demo categories, 8 menu items, 7 inventory items (optional but recommended) |
| 05 | `05_audit_logs.sql` | `audit_logs` table for the /admin/audit-logs page |
| 06 | `06_enable_realtime.sql` | Adds orders + transactions to the `supabase_realtime` publication so the live order queue + notifications bell work |
| 07 | `07_admin_user.sql` | Creates `admin@cafeconnect.local` / `CafeConnect2026!` — pick Option A or B inside |

## Migrating between Supabase projects

If you're moving CafeConnect to a new Supabase project:

1. Create the project at <https://supabase.com/dashboard>
2. Run the migrations above **in order**
3. Update `.env.local` (project root) with the new project's URL + publishable key:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   ```
4. Update `next.config.ts` — replace the Supabase hostname in
   `images.remotePatterns` with `<project-ref>.supabase.co`
5. Restart `npm run dev`
