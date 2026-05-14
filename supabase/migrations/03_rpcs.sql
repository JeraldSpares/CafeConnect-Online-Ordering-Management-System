-- Server-side helpers used by the Next.js app:
--   place_order(...)            -- customer checkout (atomic order + items)
--   get_order_by_number(...)    -- public order tracking by ORD-... number
--   sales_summary(p_days)       -- daily revenue rollup for /admin/reports

-- =========================================
-- place_order: atomically creates customer + order + items
-- =========================================
create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_order_type text,
  p_notes text,
  p_items jsonb
)
returns table (out_order_id uuid, out_order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(10,2) := 0;
  v_item jsonb;
  v_menu record;
  v_qty int;
  v_line_total numeric(10,2);
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer name is required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'order must contain at least one item';
  end if;
  if p_order_type not in ('dine_in','takeaway') then
    raise exception 'invalid order_type: %', p_order_type;
  end if;

  insert into customers (full_name, phone, email)
  values (
    trim(p_customer_name),
    nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_email), '')
  )
  returning customers.id into v_customer_id;

  insert into orders (customer_id, order_type, status, subtotal, total, notes)
  values (v_customer_id, p_order_type, 'pending', 0, 0, nullif(trim(p_notes), ''))
  returning orders.id, orders.order_number
  into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::int, 0);
    if v_qty <= 0 then
      raise exception 'quantity must be > 0';
    end if;

    select menu_items.id, menu_items.name, menu_items.price, menu_items.is_available
      into v_menu
      from menu_items
     where menu_items.id = (v_item->>'menu_item_id')::uuid;

    if not found then
      raise exception 'menu item not found: %', v_item->>'menu_item_id';
    end if;
    if not v_menu.is_available then
      raise exception 'menu item not available: %', v_menu.name;
    end if;

    v_line_total := round((v_menu.price * v_qty)::numeric, 2);
    v_subtotal := v_subtotal + v_line_total;

    insert into order_items
      (order_id, menu_item_id, item_name, quantity, unit_price, line_total, notes)
    values
      (v_order_id, v_menu.id, v_menu.name, v_qty, v_menu.price, v_line_total,
       nullif(trim(coalesce(v_item->>'notes','')),''));
  end loop;

  update orders
     set subtotal = v_subtotal,
         total    = v_subtotal
   where orders.id = v_order_id;

  out_order_id := v_order_id;
  out_order_number := v_order_number;
  return next;
end;
$$;

grant execute on function public.place_order(text,text,text,text,text,jsonb) to anon, authenticated;

-- =========================================
-- get_order_by_number: customer-side tracking (no auth needed —
-- the order_number is the secret)
-- =========================================
create or replace function public.get_order_by_number(p_order_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'subtotal', o.subtotal,
    'discount', o.discount,
    'total', o.total,
    'notes', o.notes,
    'created_at', o.created_at,
    'completed_at', o.completed_at,
    'customer', jsonb_build_object(
      'full_name', c.full_name,
      'phone', c.phone,
      'email', c.email
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_name', oi.item_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'line_total', oi.line_total,
        'notes', oi.notes
      ) order by oi.item_name)
      from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb),
    'payment', (
      select jsonb_build_object(
        'method', t.payment_method,
        'status', t.status,
        'amount', t.amount,
        'reference_number', t.reference_number
      )
      from transactions t
      where t.order_id = o.id
      order by t.created_at desc
      limit 1
    )
  )
  into v
  from orders o
  left join customers c on c.id = o.customer_id
  where o.order_number = p_order_number;

  return v;
end;
$$;

grant execute on function public.get_order_by_number(text) to anon, authenticated;

-- =========================================
-- sales_summary: daily totals for the last N days
-- =========================================
create or replace function public.sales_summary(p_days int default 7)
returns table (
  day date,
  order_count bigint,
  gross_revenue numeric,
  paid_revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - (p_days - 1))::date,
      current_date::date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    coalesce(count(o.id), 0)             as order_count,
    coalesce(sum(o.total), 0)            as gross_revenue,
    coalesce(sum(case when exists (
      select 1 from transactions t
      where t.order_id = o.id and t.status = 'paid'
    ) then o.total else 0 end), 0)        as paid_revenue
  from days d
  left join orders o
    on date(o.created_at at time zone 'Asia/Manila') = d.day
   and o.status <> 'cancelled'
  group by d.day
  order by d.day;
$$;

grant execute on function public.sales_summary(int) to authenticated;
