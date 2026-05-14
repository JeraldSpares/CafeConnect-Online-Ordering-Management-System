-- Enable Supabase Realtime for the orders + transactions tables.
-- Powers the /admin/orders "Live" indicator and the notifications bell —
-- new orders and payments push to the browser without a refresh.

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.transactions;
