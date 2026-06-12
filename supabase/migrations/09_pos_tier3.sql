-- Sulyap — POS Tier 3 enhancements
-- Adds:
--   1. orders.table_label    — which dine-in table the order is for
--   2. app_settings seed     — "table_count" so the POS can render N buttons
--
-- Re-runnable.

alter table public.orders
  add column if not exists table_label text;

insert into public.app_settings (key, value)
values ('table_count', to_jsonb(12))
on conflict (key) do nothing;
