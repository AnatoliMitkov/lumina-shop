create extension if not exists pgcrypto;

create table if not exists public.creator_applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    full_name text not null,
    email text not null,
    profile_url text not null,
    motivation text not null,
    terms_accepted boolean not null default false,
    status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'declined', 'archived')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint creator_applications_email_format_check check (position('@' in email) > 1),
    constraint creator_applications_terms_accepted_check check (terms_accepted = true)
);

alter table public.creator_applications
    add column if not exists phone text,
    add column if not exists social_links jsonb not null default '[]'::jsonb;

create index if not exists creator_applications_created_at_idx
    on public.creator_applications (created_at desc);

create index if not exists creator_applications_status_idx
    on public.creator_applications (status, created_at desc);

create index if not exists creator_applications_user_id_idx
    on public.creator_applications (user_id);

create or replace function public.set_creator_applications_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists set_creator_applications_updated_at on public.creator_applications;

create trigger set_creator_applications_updated_at
before update on public.creator_applications
for each row
execute function public.set_creator_applications_updated_at();

alter table public.creator_applications enable row level security;

drop policy if exists "Users can view own creator applications" on public.creator_applications;
drop policy if exists "Admins can view all creator applications" on public.creator_applications;
drop policy if exists "Admins can insert all creator applications" on public.creator_applications;
drop policy if exists "Admins can update all creator applications" on public.creator_applications;
drop policy if exists "Admins can delete all creator applications" on public.creator_applications;

create policy "Users can view own creator applications"
on public.creator_applications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can view all creator applications"
on public.creator_applications
for select
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.is_admin = true
    )
);

create policy "Admins can insert all creator applications"
on public.creator_applications
for insert
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.is_admin = true
    )
);

create policy "Admins can update all creator applications"
on public.creator_applications
for update
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

create policy "Admins can delete all creator applications"
on public.creator_applications
for delete
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.is_admin = true
    )
);