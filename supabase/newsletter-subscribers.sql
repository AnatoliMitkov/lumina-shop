create table if not exists public.newsletter_subscribers (
    id bigint generated always as identity primary key,
    email text not null,
    language text not null default 'en',
    source text not null default 'homepage',
    status text not null default 'active',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint newsletter_subscribers_email_normalized_check check (email = lower(btrim(email))),
    constraint newsletter_subscribers_email_format_check check (position('@' in email) > 1),
    constraint newsletter_subscribers_language_check check (language in ('en', 'bg')),
    constraint newsletter_subscribers_status_check check (status in ('active'))
);

create unique index if not exists newsletter_subscribers_email_key
    on public.newsletter_subscribers (email);

create or replace function public.set_newsletter_subscribers_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists set_newsletter_subscribers_updated_at on public.newsletter_subscribers;

create trigger set_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row
execute function public.set_newsletter_subscribers_updated_at();

alter table public.newsletter_subscribers enable row level security;