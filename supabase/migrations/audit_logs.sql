-- CafeConnect: audit_logs table
--
-- Run this once in your Supabase SQL Editor.
-- The application's logging helper (src/lib/audit.ts) silently no-ops if
-- this table doesn't exist yet, so the app keeps working until you apply
-- the migration — once applied, staff actions start being recorded.

create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_name  text,
  actor_role  text,
  action      text not null,           -- e.g. order.status_changed, payment.recorded
  entity_type text not null,           -- e.g. order, payment, menu_item, inventory_item, profile
  entity_id   text,                    -- usually a UUID, but text so we can also store order_number etc.
  entity_label text,                   -- human-readable hint shown in the UI
  metadata    jsonb,                   -- arbitrary payload (e.g. {from: "preparing", to: "ready"})
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs: staff read"   on public.audit_logs;
drop policy if exists "audit_logs: staff insert" on public.audit_logs;

create policy "audit_logs: staff read"
  on public.audit_logs for select to authenticated
  using (public.is_staff());

create policy "audit_logs: staff insert"
  on public.audit_logs for insert to authenticated
  with check (public.is_staff());
