create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'checked_out', 'abandoned')),
  currency text not null default 'EUR',
  item_count integer not null default 0,
  total numeric(10, 2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  checked_out_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.carts(id) on delete set null,
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  order_code text,
  customer_email text,
  customer_name text,
  customer_phone text,
  customer_location text,
  customer_notes text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  currency text not null default 'EUR',
  item_count integer not null default 0,
  subtotal numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  shipping_amount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  discount_code text,
  affiliate_code text,
  affiliate_commission_type text,
  affiliate_commission_value numeric(10, 2) not null default 0,
  shipping_scope text not null default 'worldwide' check (shipping_scope in ('domestic_bg', 'worldwide')),
  delivery_method text not null default 'worldwide_quote' check (delivery_method in ('speedy_address', 'speedy_office', 'econt_address', 'econt_office', 'worldwide_quote')),
  shipping_country text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_office_code text,
  shipping_office_label text,
  items jsonb not null default '[]'::jsonb,
  customer_snapshot jsonb not null default '{}'::jsonb,
  delivery_snapshot jsonb not null default '{}'::jsonb,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists carts_status_idx on public.carts (status);
create index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists orders_session_id_idx on public.orders (session_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_user_id_idx on public.orders (user_id);

alter table public.carts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists order_code text;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists customer_location text;
alter table public.orders add column if not exists customer_notes text;
alter table public.orders add column if not exists subtotal numeric(10, 2) not null default 0;
alter table public.orders add column if not exists discount_amount numeric(10, 2) not null default 0;
alter table public.orders add column if not exists shipping_amount numeric(10, 2) not null default 0;
alter table public.orders add column if not exists discount_code text;
alter table public.orders add column if not exists affiliate_code text;
alter table public.orders add column if not exists affiliate_commission_type text;
alter table public.orders add column if not exists affiliate_commission_value numeric(10, 2) not null default 0;
alter table public.orders add column if not exists shipping_scope text not null default 'worldwide';
alter table public.orders add column if not exists delivery_method text not null default 'worldwide_quote';
alter table public.orders add column if not exists shipping_country text;
alter table public.orders add column if not exists shipping_city text;
alter table public.orders add column if not exists shipping_region text;
alter table public.orders add column if not exists shipping_postal_code text;
alter table public.orders add column if not exists shipping_address_line1 text;
alter table public.orders add column if not exists shipping_address_line2 text;
alter table public.orders add column if not exists shipping_office_code text;
alter table public.orders add column if not exists shipping_office_label text;
alter table public.orders add column if not exists customer_snapshot jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists delivery_snapshot jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

update public.orders
set order_code = 'VA-' || upper(left(replace(id::text, '-', ''), 10))
where coalesce(order_code, '') = '';

update public.orders
set subtotal = coalesce(subtotal, total, 0),
    discount_amount = coalesce(discount_amount, 0),
    shipping_amount = coalesce(shipping_amount, 0),
    affiliate_commission_value = coalesce(affiliate_commission_value, 0),
    shipping_scope = case when shipping_scope in ('domestic_bg', 'worldwide') then shipping_scope else 'worldwide' end,
    delivery_method = case when delivery_method in ('speedy_address', 'speedy_office', 'econt_address', 'econt_office', 'worldwide_quote') then delivery_method else 'worldwide_quote' end,
    customer_snapshot = case when customer_snapshot is null or jsonb_typeof(customer_snapshot) <> 'object' then '{}'::jsonb else customer_snapshot end,
    delivery_snapshot = case when delivery_snapshot is null or jsonb_typeof(delivery_snapshot) <> 'object' then '{}'::jsonb else delivery_snapshot end,
    pricing_snapshot = case when pricing_snapshot is null or jsonb_typeof(pricing_snapshot) <> 'object' then '{}'::jsonb else pricing_snapshot end;

create unique index if not exists orders_order_code_uidx on public.orders (order_code);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  location text,
  notes text,
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  location text,
  query_type text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists contact_inquiries_user_id_idx on public.contact_inquiries (user_id);
create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);

drop trigger if exists carts_set_updated_at on public.carts;
drop trigger if exists profiles_set_updated_at on public.profiles;
drop trigger if exists contact_inquiries_set_updated_at on public.contact_inquiries;

create trigger carts_set_updated_at
before update on public.carts
for each row
execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger contact_inquiries_set_updated_at
before update on public.contact_inquiries
for each row
execute function public.set_updated_at();

alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.profiles enable row level security;
alter table public.contact_inquiries enable row level security;

alter table public.profiles add column if not exists is_admin boolean not null default false;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update all orders" on public.orders;
drop policy if exists "Users can view own contact inquiries" on public.contact_inquiries;
drop policy if exists "Admins can view all contact inquiries" on public.contact_inquiries;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view own orders"
on public.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Admins can view all orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can update all orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Users can view own contact inquiries"
on public.contact_inquiries
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Admins can view all contact inquiries"
on public.contact_inquiries
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;