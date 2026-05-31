create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  postal_code text,
  city text,
  country text,
  state text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

drop policy if exists "customers isolated by tenant" on public.customers;
create policy "customers isolated by tenant" on public.customers
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index if not exists customers_tenant_name_idx
on public.customers (tenant_id, name);

create index if not exists customers_tenant_postal_code_idx
on public.customers (tenant_id, postal_code);
