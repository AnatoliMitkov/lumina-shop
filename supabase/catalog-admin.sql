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

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text,
  name text not null default '',
  subtitle text not null default '',
  category text not null default 'Atelier Piece',
  collection text not null default 'Atelier Archive',
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  featured boolean not null default false,
  price numeric(10, 2) not null default 0 check (price >= 0),
  compare_at_price numeric(10, 2),
  description text not null default '',
  story text not null default '',
  materials text not null default '',
  care text not null default '',
  fit_notes text not null default '',
  artisan_note text not null default '',
  image_main text not null default '',
  image_detail text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  highlights text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  palette text[] not null default '{}'::text[],
  inventory_count integer not null default 0,
  lead_time_days integer not null default 14,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_gallery_is_array check (jsonb_typeof(gallery) = 'array')
);

alter table public.products add column if not exists slug text;
alter table public.products add column if not exists subtitle text not null default '';
alter table public.products add column if not exists collection text not null default 'Atelier Archive';
alter table public.products add column if not exists status text not null default 'active';
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists compare_at_price numeric(10, 2);
alter table public.products add column if not exists story text not null default '';
alter table public.products add column if not exists materials text not null default '';
alter table public.products add column if not exists care text not null default '';
alter table public.products add column if not exists fit_notes text not null default '';
alter table public.products add column if not exists artisan_note text not null default '';
alter table public.products add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists highlights text[] not null default '{}'::text[];
alter table public.products add column if not exists tags text[] not null default '{}'::text[];
alter table public.products add column if not exists palette text[] not null default '{}'::text[];
alter table public.products add column if not exists inventory_count integer not null default 0;
alter table public.products add column if not exists lead_time_days integer not null default 14;
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.products add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.profiles add column if not exists is_admin boolean not null default false;

update public.products
set slug = lower(trim(both '-' from regexp_replace(regexp_replace(coalesce(nullif(name, ''), 'atelier-piece'), '[^a-zA-Z0-9]+', '-', 'g'), '-{2,}', '-', 'g'))) || '-' || left(id::text, 6)
where coalesce(slug, '') = '';

update public.products
set collection = coalesce(nullif(collection, ''), coalesce(nullif(category, ''), 'Atelier Archive'))
where coalesce(collection, '') = '';

update public.products
set category = 'Atelier Piece'
where coalesce(category, '') = '';

update public.products
set status = 'active'
where coalesce(status, '') not in ('draft', 'active', 'archived');

update public.products
set gallery = '[]'::jsonb
where gallery is null
   or jsonb_typeof(gallery) <> 'array';

update public.products
set highlights = '{}'::text[]
where highlights is null;

update public.products
set tags = '{}'::text[]
where tags is null;

update public.products
set palette = '{}'::text[]
where palette is null;

update public.products
set inventory_count = greatest(coalesce(inventory_count, 0), 0),
    lead_time_days = greatest(coalesce(lead_time_days, 14), 1),
    sort_order = coalesce(sort_order, 0);

alter table public.products alter column slug set not null;

create unique index if not exists products_slug_uidx on public.products (slug);
create index if not exists products_status_sort_idx on public.products (status, featured desc, sort_order asc, updated_at desc);
create index if not exists products_collection_idx on public.products (collection);
create index if not exists products_category_idx on public.products (category);
create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

drop trigger if exists products_set_updated_at on public.products;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "Public can view active products" on public.products;
drop policy if exists "Admins can view all products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can view all contact inquiries" on public.contact_inquiries;
drop policy if exists "Admins can update all contact inquiries" on public.contact_inquiries;

create policy "Public can view active products"
on public.products
for select
to anon, authenticated
using (status = 'active');

create policy "Admins can view all products"
on public.products
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

create policy "Admins can insert products"
on public.products
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

create policy "Admins can update products"
on public.products
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

create policy "Admins can delete products"
on public.products
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product media" on storage.objects;
drop policy if exists "Admins can upload product media" on storage.objects;
drop policy if exists "Admins can update product media" on storage.objects;
drop policy if exists "Admins can delete product media" on storage.objects;

create policy "Public can view product media"
on storage.objects
for select
to public
using (bucket_id = 'product-media');

create policy "Admins can upload product media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can update product media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can delete product media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);
