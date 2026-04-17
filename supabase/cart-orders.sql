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
  customer_email text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  currency text not null default 'EUR',
  item_count integer not null default 0,
  total numeric(10, 2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists carts_status_idx on public.carts (status);
create index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists orders_session_id_idx on public.orders (session_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_user_id_idx on public.orders (user_id);

alter table public.carts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists customer_email text;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  location text,
  notes text,
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

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can view own contact inquiries" on public.contact_inquiries;

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

create policy "Users can view own contact inquiries"
on public.contact_inquiries
for select
to authenticated
using ((select auth.uid()) = user_id);