-- CafeConnect: initial schema
-- Maps to the 5 capstone modules:
--   1. Online ordering (orders, order_items)
--   2. Sales & transactions (transactions)
--   3. Real-time inventory (inventory_items, inventory_movements)
--   4. Customer records (customers, profiles)
--   5. Financial reporting (reads across orders + transactions)

-- =========================================
-- profiles: extends auth.users with role + display info
-- =========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('admin','staff','customer')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- helper: am I staff or admin?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','staff')
  );
$$;

-- =========================================
-- categories + menu_items
-- =========================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.menu_items(category_id);

-- =========================================
-- inventory
-- =========================================
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null,
  stock_quantity numeric(12,3) not null default 0,
  reorder_level numeric(12,3) not null default 0,
  cost_per_unit numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  change_amount numeric(12,3) not null,
  reason text not null check (reason in ('restock','order_deduction','wastage','adjustment')),
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.inventory_movements(inventory_item_id, created_at desc);

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
as $$
begin
  update public.inventory_items
     set stock_quantity = stock_quantity + new.change_amount,
         updated_at = now()
   where id = new.inventory_item_id;
  return new;
end;
$$;

create trigger trg_apply_inventory_movement
after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement();

-- =========================================
-- customers (supports walk-ins + registered)
-- =========================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.customers(user_id);

-- =========================================
-- orders + order_items
-- =========================================
create sequence if not exists public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('ORD-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0')),
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','preparing','ready','completed','cancelled')),
  order_type text not null default 'takeaway'
    check (order_type in ('dine_in','takeaway')),
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  placed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index on public.orders(status, created_at desc);
create index on public.orders(customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  notes text
);
create index on public.order_items(order_id);

-- =========================================
-- transactions (payments)
-- =========================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method text not null check (payment_method in ('cash','gcash','maya','card')),
  amount numeric(10,2) not null check (amount >= 0),
  reference_number text,
  status text not null default 'pending'
    check (status in ('pending','paid','refunded')),
  processed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.transactions(order_id);
create index on public.transactions(status, created_at desc);

-- =========================================
-- auto-create profile when a new auth user signs up
-- =========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
