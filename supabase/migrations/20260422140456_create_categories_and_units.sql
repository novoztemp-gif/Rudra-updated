-- PRODUCT CATEGORIES
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- UNITS
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- INITIAL DATA
insert into public.product_categories (name)
values
  ('Granite'),
  ('Marble'),
  ('Tiles'),
  ('Stone')
on conflict (name) do nothing;

insert into public.units (name)
values
  ('sqf'),
  ('piece'),
  ('slab')
on conflict (name) do nothing;

-- RLS
alter table public.product_categories enable row level security;
alter table public.units enable row level security;

create policy "Allow read product_categories"
on public.product_categories
for select
to authenticated
using (true);

create policy "Allow insert product_categories"
on public.product_categories
for insert
to authenticated
with check (true);

create policy "Allow update product_categories"
on public.product_categories
for update
to authenticated
using (true)
with check (true);

create policy "Allow delete product_categories"
on public.product_categories
for delete
to authenticated
using (true);

create policy "Allow read units"
on public.units
for select
to authenticated
using (true);

create policy "Allow insert units"
on public.units
for insert
to authenticated
with check (true);

create policy "Allow update units"
on public.units
for update
to authenticated
using (true)
with check (true);

create policy "Allow delete units"
on public.units
for delete
to authenticated
using (true);