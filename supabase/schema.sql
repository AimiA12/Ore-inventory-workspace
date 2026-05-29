-- Mine stock Web App schema for Supabase
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.mine_piles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ore_type text not null,
  source text default '',
  location text default '',
  dry_weight_ton numeric default 0,
  wet_weight_ton numeric default 0,
  moisture_rate numeric default 0,
  purchase_cost numeric default 0,
  remark text default '',
  assays jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  buyer text not null default '',
  sold_at timestamptz not null default now(),
  pile_count integer not null default 0,
  pile_names text not null default '',
  piles jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  total_dry_weight_ton numeric default 0,
  total_purchase_cost numeric default 0,
  total_revenue numeric default 0,
  total_profit numeric default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_sale_prices (
  user_id uuid not null references auth.users(id) on delete cascade,
  element text not null,
  price numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, element)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mine_piles_set_updated_at on public.mine_piles;
create trigger mine_piles_set_updated_at
before update on public.mine_piles
for each row execute function public.set_updated_at();

drop trigger if exists user_sale_prices_set_updated_at on public.user_sale_prices;
create trigger user_sale_prices_set_updated_at
before update on public.user_sale_prices
for each row execute function public.set_updated_at();

alter table public.mine_piles enable row level security;
alter table public.sale_records enable row level security;
alter table public.user_sale_prices enable row level security;

drop policy if exists "Users can read own mine piles" on public.mine_piles;
create policy "Users can read own mine piles"
on public.mine_piles for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own mine piles" on public.mine_piles;
create policy "Users can insert own mine piles"
on public.mine_piles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own mine piles" on public.mine_piles;
create policy "Users can update own mine piles"
on public.mine_piles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own mine piles" on public.mine_piles;
create policy "Users can delete own mine piles"
on public.mine_piles for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own sale records" on public.sale_records;
create policy "Users can read own sale records"
on public.sale_records for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own sale records" on public.sale_records;
create policy "Users can insert own sale records"
on public.sale_records for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sale records" on public.sale_records;
create policy "Users can delete own sale records"
on public.sale_records for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own sale prices" on public.user_sale_prices;
create policy "Users can read own sale prices"
on public.user_sale_prices for select
using (auth.uid() = user_id);

drop policy if exists "Users can upsert own sale prices" on public.user_sale_prices;
create policy "Users can upsert own sale prices"
on public.user_sale_prices for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own sale prices" on public.user_sale_prices;
create policy "Users can update own sale prices"
on public.user_sale_prices for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sale prices" on public.user_sale_prices;
create policy "Users can delete own sale prices"
on public.user_sale_prices for delete
using (auth.uid() = user_id);
