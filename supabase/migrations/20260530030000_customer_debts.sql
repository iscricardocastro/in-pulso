alter type sale_status add value if not exists 'with_debt';

alter table public.sales
add column if not exists paid_total numeric(12,2) not null default 0 check (paid_total >= 0),
add column if not exists balance_due numeric(12,2) not null default 0 check (balance_due >= 0);

create table if not exists public.customer_debts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_id uuid not null references public.sales(id) on delete cascade,
  original_amount numeric(12,2) not null default 0 check (original_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  balance numeric(12,2) not null default 0 check (balance >= 0),
  status text not null default 'open' check (status in ('open', 'paid', 'canceled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sale_id)
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  debt_id uuid not null references public.customer_debts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  payment_method_id uuid not null references public.catalog_items(id) on delete restrict,
  payment_method_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  comments text,
  created_at timestamptz not null default now()
);

drop trigger if exists customer_debts_updated_at on public.customer_debts;
create trigger customer_debts_updated_at before update on public.customer_debts for each row execute function public.set_updated_at();

alter table public.customer_debts enable row level security;
alter table public.debt_payments enable row level security;

drop policy if exists "customer debts isolated by tenant" on public.customer_debts;
create policy "customer debts isolated by tenant" on public.customer_debts
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists "debt payments isolated by tenant" on public.debt_payments;
create policy "debt payments isolated by tenant" on public.debt_payments
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index if not exists customer_debts_tenant_customer_idx on public.customer_debts (tenant_id, customer_id, status);
create index if not exists customer_debts_tenant_sale_idx on public.customer_debts (tenant_id, sale_id);
create index if not exists debt_payments_tenant_debt_idx on public.debt_payments (tenant_id, debt_id, created_at desc);

notify pgrst, 'reload schema';
