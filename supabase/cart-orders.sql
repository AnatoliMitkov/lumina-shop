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
  checkout_mode text not null default 'manual_review' check (checkout_mode in ('manual_review', 'stripe_checkout')),
  payment_status text not null default 'manual_review' check (payment_status in ('manual_review', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  payment_provider text,
  payment_reference text,
  payment_intent_id text,
  amount_paid numeric(10, 2) not null default 0,
  paid_at timestamptz,
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
  admin_attention_status text not null default 'unseen' check (admin_attention_status in ('unseen', 'reviewing', 'seen')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('stripe')),
  mode text not null default 'full' check (mode in ('full')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  currency text not null default 'EUR',
  amount numeric(10, 2) not null default 0,
  provider_session_id text unique,
  provider_payment_intent_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz
);

create index if not exists carts_status_idx on public.carts (status);
create index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists orders_session_id_idx on public.orders (session_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

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
alter table public.orders add column if not exists checkout_mode text not null default 'manual_review';
alter table public.orders add column if not exists payment_status text not null default 'manual_review';
alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_intent_id text;
alter table public.orders add column if not exists amount_paid numeric(10, 2) not null default 0;
alter table public.orders add column if not exists paid_at timestamptz;
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
alter table public.orders add column if not exists admin_attention_status text not null default 'unseen';

alter table public.payments add column if not exists provider text not null default 'stripe';
alter table public.payments add column if not exists mode text not null default 'full';
alter table public.payments add column if not exists status text not null default 'pending';
alter table public.payments add column if not exists currency text not null default 'EUR';
alter table public.payments add column if not exists amount numeric(10, 2) not null default 0;
alter table public.payments add column if not exists provider_session_id text;
alter table public.payments add column if not exists provider_payment_intent_id text;
alter table public.payments add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.payments add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.payments add column if not exists paid_at timestamptz;

update public.orders
set order_code = 'VA-' || upper(left(replace(id::text, '-', ''), 10))
where coalesce(order_code, '') = '';

update public.orders
set subtotal = coalesce(subtotal, total, 0),
    discount_amount = coalesce(discount_amount, 0),
    shipping_amount = coalesce(shipping_amount, 0),
    affiliate_commission_value = coalesce(affiliate_commission_value, 0),
  amount_paid = coalesce(amount_paid, 0),
    shipping_scope = case when shipping_scope in ('domestic_bg', 'worldwide') then shipping_scope else 'worldwide' end,
    delivery_method = case when delivery_method in ('speedy_address', 'speedy_office', 'econt_address', 'econt_office', 'worldwide_quote') then delivery_method else 'worldwide_quote' end,
  checkout_mode = case when checkout_mode in ('manual_review', 'stripe_checkout') then checkout_mode else 'manual_review' end,
  payment_status = case when payment_status in ('manual_review', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'expired', 'refunded') then payment_status else 'manual_review' end,
    admin_attention_status = case
      when admin_attention_status in ('unseen', 'reviewing', 'seen') then admin_attention_status
      when status in ('fulfilled', 'cancelled') then 'seen'
      else 'unseen'
    end,
    customer_snapshot = case when customer_snapshot is null or jsonb_typeof(customer_snapshot) <> 'object' then '{}'::jsonb else customer_snapshot end,
    delivery_snapshot = case when delivery_snapshot is null or jsonb_typeof(delivery_snapshot) <> 'object' then '{}'::jsonb else delivery_snapshot end,
    pricing_snapshot = case when pricing_snapshot is null or jsonb_typeof(pricing_snapshot) <> 'object' then '{}'::jsonb else pricing_snapshot end;

create unique index if not exists orders_order_code_uidx on public.orders (order_code);
  create index if not exists orders_payment_status_idx on public.orders (payment_status, created_at desc);
create index if not exists orders_admin_attention_idx on public.orders (admin_attention_status, created_at desc);
create unique index if not exists payments_provider_session_uidx on public.payments (provider_session_id) where provider_session_id is not null;

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

create table if not exists public.site_copy_entries (
  key text primary key,
  value text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  description text,
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'fixed_amount')),
  discount_value numeric(10, 2) not null default 0,
  shipping_benefit text not null default 'none' check (shipping_benefit in ('none', 'sender_covers', 'receiver_covers')),
  can_stack_with_affiliate boolean not null default false,
  minimum_subtotal numeric(10, 2) not null default 0,
  usage_limit integer,
  usage_count integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.affiliate_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  partner_name text,
  notes text,
  customer_discount_type text not null default 'none' check (customer_discount_type in ('none', 'percentage', 'fixed_amount')),
  customer_discount_value numeric(10, 2) not null default 0,
  commission_type text not null default 'percentage' check (commission_type in ('percentage', 'fixed_amount')),
  commission_value numeric(10, 2) not null default 0,
  can_stack_with_discount boolean not null default false,
  minimum_subtotal numeric(10, 2) not null default 0,
  usage_limit integer,
  usage_count integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists contact_inquiries_user_id_idx on public.contact_inquiries (user_id);
create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);
create index if not exists site_copy_entries_updated_at_idx on public.site_copy_entries (updated_at desc);
alter table public.discount_codes add column if not exists shipping_benefit text not null default 'none' check (shipping_benefit in ('none', 'sender_covers', 'receiver_covers'));
alter table public.discount_codes add column if not exists can_stack_with_affiliate boolean not null default false;
alter table public.affiliate_codes add column if not exists can_stack_with_discount boolean not null default false;
create index if not exists discount_codes_code_idx on public.discount_codes (code);
create index if not exists discount_codes_active_idx on public.discount_codes (is_active, starts_at, ends_at);
create index if not exists affiliate_codes_code_idx on public.affiliate_codes (code);
create index if not exists affiliate_codes_active_idx on public.affiliate_codes (is_active, starts_at, ends_at);

drop trigger if exists carts_set_updated_at on public.carts;
drop trigger if exists profiles_set_updated_at on public.profiles;
drop trigger if exists contact_inquiries_set_updated_at on public.contact_inquiries;
drop trigger if exists site_copy_entries_set_updated_at on public.site_copy_entries;
drop trigger if exists discount_codes_set_updated_at on public.discount_codes;
drop trigger if exists affiliate_codes_set_updated_at on public.affiliate_codes;
drop trigger if exists payments_set_updated_at on public.payments;

alter table public.contact_inquiries add column if not exists admin_attention_status text not null default 'unseen';
create index if not exists contact_inquiries_attention_idx on public.contact_inquiries (admin_attention_status, created_at desc);

update public.contact_inquiries
set admin_attention_status = case
  when admin_attention_status in ('unseen', 'reviewing', 'seen') then admin_attention_status
  when status = 'closed' then 'seen'
  when status = 'in_progress' then 'reviewing'
  else 'unseen'
end;


update public.discount_codes
set shipping_benefit = case when shipping_benefit in ('sender_covers', 'receiver_covers') then shipping_benefit else 'none' end,
    can_stack_with_affiliate = coalesce(can_stack_with_affiliate, false);

update public.affiliate_codes
set can_stack_with_discount = coalesce(can_stack_with_discount, false);
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

create trigger site_copy_entries_set_updated_at
before update on public.site_copy_entries
for each row
execute function public.set_updated_at();

create trigger discount_codes_set_updated_at
before update on public.discount_codes
for each row
execute function public.set_updated_at();

create trigger affiliate_codes_set_updated_at
before update on public.affiliate_codes
for each row
execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.profiles enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.site_copy_entries enable row level security;
alter table public.discount_codes enable row level security;
alter table public.affiliate_codes enable row level security;
alter table public.payments enable row level security;

alter table public.profiles add column if not exists is_admin boolean not null default false;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update all orders" on public.orders;
drop policy if exists "Admins can delete all orders" on public.orders;
drop policy if exists "Users can view own contact inquiries" on public.contact_inquiries;
drop policy if exists "Admins can view all contact inquiries" on public.contact_inquiries;
drop policy if exists "Admins can update all contact inquiries" on public.contact_inquiries;
drop policy if exists "Admins can delete all contact inquiries" on public.contact_inquiries;
drop policy if exists "Public can view site copy entries" on public.site_copy_entries;
drop policy if exists "Admins can insert site copy entries" on public.site_copy_entries;
drop policy if exists "Admins can update site copy entries" on public.site_copy_entries;
drop policy if exists "Admins can delete site copy entries" on public.site_copy_entries;
drop policy if exists "Admins can view all discount codes" on public.discount_codes;
drop policy if exists "Admins can insert all discount codes" on public.discount_codes;
drop policy if exists "Admins can update all discount codes" on public.discount_codes;
drop policy if exists "Admins can delete all discount codes" on public.discount_codes;
drop policy if exists "Admins can view all affiliate codes" on public.affiliate_codes;
drop policy if exists "Admins can insert all affiliate codes" on public.affiliate_codes;
drop policy if exists "Admins can update all affiliate codes" on public.affiliate_codes;
drop policy if exists "Admins can delete all affiliate codes" on public.affiliate_codes;
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Admins can view all payments" on public.payments;

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

create policy "Admins can delete all orders"
on public.orders
for delete
to authenticated
using (
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

create policy "Admins can update all contact inquiries"
on public.contact_inquiries
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

create policy "Admins can delete all contact inquiries"
on public.contact_inquiries
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Public can view site copy entries"
on public.site_copy_entries
for select
to anon, authenticated
using (true);

create policy "Admins can insert site copy entries"
on public.site_copy_entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can update site copy entries"
on public.site_copy_entries
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

create policy "Admins can delete site copy entries"
on public.site_copy_entries
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can view all discount codes"
on public.discount_codes
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

create policy "Admins can insert all discount codes"
on public.discount_codes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can update all discount codes"
on public.discount_codes
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

create policy "Admins can delete all discount codes"
on public.discount_codes
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can view all affiliate codes"
on public.affiliate_codes
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

create policy "Admins can insert all affiliate codes"
on public.affiliate_codes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can update all affiliate codes"
on public.affiliate_codes
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

create policy "Admins can delete all affiliate codes"
on public.affiliate_codes
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Users can view own payments"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = payments.order_id
      and orders.user_id = auth.uid()
  )
);

create policy "Admins can view all payments"
on public.payments
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

create or replace function public.finalize_order_payment(
  p_order_id uuid,
  p_payment_provider text,
  p_payment_reference text,
  p_payment_intent_id text,
  p_amount_paid numeric
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  updated_order public.orders%rowtype;
  order_item jsonb;
begin
  select *
  into current_order
  from public.orders
  where id = p_order_id
  for update;

  if current_order.id is null then
    return null;
  end if;

  if current_order.payment_status = 'paid' then
    return current_order;
  end if;

  update public.orders
  set status = 'paid',
      payment_status = 'paid',
      payment_provider = coalesce(nullif(p_payment_provider, ''), payment_provider),
      payment_reference = coalesce(nullif(p_payment_reference, ''), payment_reference),
      payment_intent_id = coalesce(nullif(p_payment_intent_id, ''), payment_intent_id),
      amount_paid = greatest(coalesce(p_amount_paid, 0), 0),
      paid_at = coalesce(paid_at, timezone('utc', now()))
  where id = current_order.id
  returning * into updated_order;

  if updated_order.cart_id is not null then
    update public.carts
    set status = 'checked_out',
        checked_out_at = coalesce(checked_out_at, timezone('utc', now()))
    where id = updated_order.cart_id;
  end if;

  for order_item in
    select value
    from jsonb_array_elements(coalesce(updated_order.items, '[]'::jsonb))
  loop
    begin
      update public.products
      set inventory_count = greatest(inventory_count - 1, 0)
      where id = nullif(order_item->>'id', '')::uuid
        and inventory_count > 0;
    exception
      when others then
        null;
    end;
  end loop;

  return updated_order;
end;
$$;

create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;