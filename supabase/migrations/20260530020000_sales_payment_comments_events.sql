alter table public.sale_payments
add column if not exists comments text;

create table if not exists public.sale_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('created', 'updated', 'canceled', 'refunded')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.sale_events enable row level security;

drop policy if exists "sale events isolated by tenant" on public.sale_events;
create policy "sale events isolated by tenant" on public.sale_events
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index if not exists sale_events_tenant_sale_idx on public.sale_events (tenant_id, sale_id, created_at desc);

notify pgrst, 'reload schema';
