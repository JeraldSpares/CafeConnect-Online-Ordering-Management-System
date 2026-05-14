-- Row Level Security policies
-- - Menu/categories: public read (so customer ordering page works anonymously),
--   staff-only write.
-- - Inventory + orders + transactions + customers: staff only.
-- - Profiles: each user reads/updates own; staff reads all.

alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.menu_items          enable row level security;
alter table public.inventory_items     enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.transactions        enable row level security;

-- ---------- profiles ----------
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: staff manage all"
  on public.profiles for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------- categories ----------
create policy "categories: public read"
  on public.categories for select to anon, authenticated using (true);

create policy "categories: staff write"
  on public.categories for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- menu_items ----------
create policy "menu_items: public read"
  on public.menu_items for select to anon, authenticated using (true);

create policy "menu_items: staff write"
  on public.menu_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- inventory_items ----------
create policy "inventory_items: staff only"
  on public.inventory_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- inventory_movements ----------
create policy "inventory_movements: staff only"
  on public.inventory_movements for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- customers ----------
create policy "customers: staff manage all"
  on public.customers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "customers: read own"
  on public.customers for select to authenticated
  using (user_id = auth.uid());

-- ---------- orders ----------
create policy "orders: staff manage all"
  on public.orders for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "orders: customer reads own"
  on public.orders for select to authenticated
  using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

-- ---------- order_items ----------
create policy "order_items: staff manage all"
  on public.order_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "order_items: customer reads own"
  on public.order_items for select to authenticated
  using (
    order_id in (
      select o.id from public.orders o
      join public.customers c on c.id = o.customer_id
      where c.user_id = auth.uid()
    )
  );

-- ---------- transactions ----------
create policy "transactions: staff manage all"
  on public.transactions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "transactions: customer reads own"
  on public.transactions for select to authenticated
  using (
    order_id in (
      select o.id from public.orders o
      join public.customers c on c.id = o.customer_id
      where c.user_id = auth.uid()
    )
  );
