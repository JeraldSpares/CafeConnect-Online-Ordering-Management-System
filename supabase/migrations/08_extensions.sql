-- CafeConnect — feature extensions
-- Adds: discount codes, recipe linking (auto inventory deduction),
-- staff shift tracking, key/value app settings.

-- =========================================
-- app_settings — key/value store for things like revenue goals,
-- demo mode flag, BIR business info, etc.
-- =========================================
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings: staff read"   on public.app_settings;
drop policy if exists "app_settings: staff write"  on public.app_settings;

create policy "app_settings: staff read"
  on public.app_settings for select to authenticated
  using (public.is_staff());

create policy "app_settings: staff write"
  on public.app_settings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Seed reasonable defaults
insert into public.app_settings (key, value) values
  ('revenue_goal_monthly',    to_jsonb(30000)),
  ('demo_mode',               to_jsonb(false)),
  ('business_name',           to_jsonb('Hebrews Kape')),
  ('business_tin',            to_jsonb('000-000-000-000')),
  ('business_address',        to_jsonb('Cabanatuan City, Nueva Ecija')),
  ('vat_rate',                to_jsonb(0.12)),
  ('loyalty_threshold',       to_jsonb(10))
on conflict (key) do nothing;

-- =========================================
-- discounts — promo / discount codes
-- =========================================
create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  -- amount = percent (0-100) when kind='percent'; peso amount when kind='fixed'
  kind text not null check (kind in ('percent','fixed')),
  amount numeric(10,2) not null check (amount >= 0),
  min_order_total numeric(10,2) not null default 0,
  max_uses int,                       -- null = unlimited
  uses_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists discounts_code_idx on public.discounts(lower(code));

alter table public.discounts enable row level security;

drop policy if exists "discounts: public read active" on public.discounts;
drop policy if exists "discounts: staff write"        on public.discounts;

-- Customers need to be able to *validate* a code (lookup by code).
-- Limit to active + within-window discounts.
create policy "discounts: public read active"
  on public.discounts for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
  );

create policy "discounts: staff write"
  on public.discounts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Add discount column to orders so we can record which discount was used.
alter table public.orders
  add column if not exists discount_code text,
  add column if not exists discount_id uuid references public.discounts(id);

-- Helper to apply a discount to a subtotal — returns the discount value.
create or replace function public.apply_discount(
  p_code text,
  p_subtotal numeric
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.discounts;
  v_amount numeric(10,2) := 0;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return 0;
  end if;

  select * into d from public.discounts
   where lower(code) = lower(trim(p_code))
     and is_active
     and (starts_at is null or starts_at <= now())
     and (expires_at is null or expires_at >= now())
     and (max_uses is null or uses_count < max_uses)
     and p_subtotal >= min_order_total
   limit 1;

  if not found then return 0; end if;

  if d.kind = 'percent' then
    v_amount := round((p_subtotal * d.amount / 100)::numeric, 2);
  else
    v_amount := least(d.amount, p_subtotal);
  end if;

  return v_amount;
end;
$$;

grant execute on function public.apply_discount(text, numeric) to anon, authenticated;

-- =========================================
-- menu_item_ingredients — recipe linking
-- Each menu item can pull from multiple inventory items.
-- =========================================
create table if not exists public.menu_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity numeric(12,3) not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (menu_item_id, inventory_item_id)
);

create index if not exists menu_item_ingredients_item_idx
  on public.menu_item_ingredients(menu_item_id);

alter table public.menu_item_ingredients enable row level security;

drop policy if exists "ingredients: staff manage" on public.menu_item_ingredients;
create policy "ingredients: staff manage"
  on public.menu_item_ingredients for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Trigger: when an order transitions to 'completed', deduct ingredients
-- from inventory based on the recipe. Each deduction creates an
-- inventory_movements row so the audit trail stays consistent.
create or replace function public.deduct_recipe_on_order_complete()
returns trigger
language plpgsql
as $$
declare
  oi record;
  ing record;
begin
  -- Only run on the pending/preparing/ready -> completed transition
  if not (new.status = 'completed' and (old.status is null or old.status <> 'completed')) then
    return new;
  end if;

  for oi in
    select menu_item_id, quantity
      from public.order_items
     where order_id = new.id and menu_item_id is not null
  loop
    for ing in
      select inventory_item_id, quantity
        from public.menu_item_ingredients
       where menu_item_id = oi.menu_item_id
    loop
      insert into public.inventory_movements
        (inventory_item_id, change_amount, reason, reference_id, notes)
      values
        (ing.inventory_item_id,
         -1 * (ing.quantity * oi.quantity),
         'order_deduction',
         new.id,
         'auto-deducted from completed order ' || new.order_number);
    end loop;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_deduct_recipe_on_order_complete on public.orders;
create trigger trg_deduct_recipe_on_order_complete
after update of status on public.orders
for each row execute function public.deduct_recipe_on_order_complete();

-- =========================================
-- shifts — staff shift tracking
-- =========================================
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);

create index if not exists shifts_user_idx on public.shifts(user_id, started_at desc);

alter table public.shifts enable row level security;

drop policy if exists "shifts: staff read"   on public.shifts;
drop policy if exists "shifts: own insert"   on public.shifts;
drop policy if exists "shifts: own update"   on public.shifts;
drop policy if exists "shifts: staff write"  on public.shifts;

create policy "shifts: staff read"
  on public.shifts for select to authenticated
  using (public.is_staff());

create policy "shifts: own insert"
  on public.shifts for insert to authenticated
  with check (user_id = auth.uid() and public.is_staff());

create policy "shifts: own update"
  on public.shifts for update to authenticated
  using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid() and public.is_staff());

-- =========================================
-- low-stock ETA: estimate days until each item runs out based on
-- recent consumption rate.
-- =========================================
create or replace function public.inventory_eta(p_lookback_days int default 14)
returns table (
  inventory_item_id uuid,
  name text,
  unit text,
  stock_quantity numeric,
  reorder_level numeric,
  daily_consumption numeric,
  days_remaining numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with consumption as (
    select inventory_item_id,
           sum(abs(change_amount)) / nullif(p_lookback_days, 0) as daily
      from inventory_movements
     where change_amount < 0
       and created_at >= now() - (p_lookback_days || ' days')::interval
     group by inventory_item_id
  )
  select i.id,
         i.name,
         i.unit,
         i.stock_quantity,
         i.reorder_level,
         coalesce(c.daily, 0) as daily_consumption,
         case
           when coalesce(c.daily, 0) = 0 then null
           else round((i.stock_quantity / c.daily)::numeric, 1)
         end as days_remaining
    from inventory_items i
    left join consumption c on c.inventory_item_id = i.id
   order by days_remaining nulls last;
$$;

grant execute on function public.inventory_eta(int) to authenticated;

-- =========================================
-- customer_orders_by_phone — for the /my-orders page.
-- Returns a customer's order history given just a phone number.
-- security definer + anon grant so a not-signed-in customer can look up.
-- =========================================
create or replace function public.customer_orders_by_phone(p_phone text)
returns table (
  order_number text,
  status text,
  order_type text,
  total numeric,
  created_at timestamptz,
  customer_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.order_number,
    o.status,
    o.order_type,
    o.total,
    o.created_at,
    c.full_name as customer_name
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where length(trim(p_phone)) >= 7
    and c.phone is not null
    and regexp_replace(c.phone, '[^0-9]', '', 'g') =
        regexp_replace(p_phone,   '[^0-9]', '', 'g')
  order by o.created_at desc
  limit 50;
$$;

grant execute on function public.customer_orders_by_phone(text) to anon, authenticated;

-- =========================================
-- customer_loyalty_status — returns paid-order count + threshold so we can
-- show "X / 10 stamps until your free coffee" on the menu page.
-- =========================================
create or replace function public.customer_loyalty_status(p_phone text)
returns table (
  full_name text,
  paid_orders bigint,
  next_free_at int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_phone_clean text;
  v_threshold int := 10;
  v_cust_id uuid;
  v_cust_name text;
  v_paid bigint;
begin
  v_phone_clean := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if length(v_phone_clean) < 7 then
    return;
  end if;

  -- Resolve threshold from settings (fallback 10)
  select coalesce((value::text)::int, 10)
    into v_threshold
    from public.app_settings
   where key = 'loyalty_threshold'
   limit 1;
  if v_threshold is null then
    v_threshold := 10;
  end if;

  -- Find the customer by phone
  select c.id, c.full_name
    into v_cust_id, v_cust_name
    from public.customers c
   where c.phone is not null
     and regexp_replace(c.phone, '[^0-9]', '', 'g') = v_phone_clean
   order by c.created_at desc
   limit 1;

  if v_cust_id is null then
    return;
  end if;

  -- Count paid completed orders
  select count(*)
    into v_paid
    from public.orders o
    join public.transactions tx on tx.order_id = o.id
   where o.customer_id = v_cust_id
     and tx.status = 'paid'
     and o.status = 'completed';

  full_name    := v_cust_name;
  paid_orders  := coalesce(v_paid, 0);
  next_free_at := v_threshold;
  return next;
end;
$$;

grant execute on function public.customer_loyalty_status(text) to anon, authenticated;
