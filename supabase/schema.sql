create extension if not exists pgcrypto;
create table if not exists public.pledges (
 id uuid primary key default gen_random_uuid(),
 first_name text not null check (char_length(first_name) between 1 and 80),
 phone_or_email text not null,
 amount numeric(12,2) not null check (amount > 0),
 percentages jsonb not null,
 status text not null default 'pending' check (status in ('pending','paid','cancelled')),
 created_at timestamptz not null default now()
);
create table if not exists public.gala_settings (
 id integer primary key default 1 check (id=1),
 project_names jsonb not null default '{"projet_a":"Projet A","projet_b":"Projet B","projet_c":"Projet C"}',
 smile_url text not null default ''
);
insert into public.gala_settings(id) values (1) on conflict do nothing;
alter table public.pledges enable row level security;
alter table public.gala_settings enable row level security;
-- No anonymous read/write policies: API server uses service role.
