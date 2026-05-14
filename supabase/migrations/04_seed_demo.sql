-- Seed a small demo dataset so the admin dashboard isn't empty during
-- development. Safe to skip if you want a totally empty start.

insert into public.categories (name, description, sort_order) values
  ('Espresso',      'Espresso-based hot drinks', 1),
  ('Brewed Coffee', 'Drip and pour-over coffee', 2),
  ('Cold Drinks',   'Iced beverages and frappes', 3),
  ('Pastries',      'Baked goods and snacks',     4);

with c as (select id, name from public.categories)
insert into public.menu_items (category_id, name, description, price) values
  ((select id from c where name='Espresso'),      'Americano',         'Espresso with hot water',                  95.00),
  ((select id from c where name='Espresso'),      'Cappuccino',        'Espresso with steamed milk and foam',     120.00),
  ((select id from c where name='Espresso'),      'Cafe Latte',        'Espresso with steamed milk',              125.00),
  ((select id from c where name='Brewed Coffee'), 'House Blend',       'Daily drip coffee',                        85.00),
  ((select id from c where name='Cold Drinks'),   'Iced Coffee',       'Cold brew over ice',                      110.00),
  ((select id from c where name='Cold Drinks'),   'Caramel Frappe',    'Blended caramel coffee',                  150.00),
  ((select id from c where name='Pastries'),      'Butter Croissant',  'Flaky butter croissant',                   75.00),
  ((select id from c where name='Pastries'),      'Chocolate Muffin',  'Rich chocolate muffin',                    80.00);

insert into public.inventory_items (name, unit, stock_quantity, reorder_level, cost_per_unit) values
  ('Coffee Beans',    'kg',  10.000,   2.000,  650.00),
  ('Whole Milk',      'L',   15.000,   5.000,  120.00),
  ('Sugar',           'kg',   8.000,   2.000,   65.00),
  ('Caramel Syrup',   'ml', 2000.000, 500.000,   0.80),
  ('Disposable Cups', 'pcs', 500.000, 100.000,   4.50),
  ('Croissants',      'pcs',  40.000,  10.000,  28.00),
  ('Muffins',         'pcs',  35.000,  10.000,  25.00);
