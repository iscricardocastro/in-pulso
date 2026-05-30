alter table public.catalog_items
drop constraint if exists catalog_items_kind_check;

alter table public.catalog_items
add constraint catalog_items_kind_check
check (kind in ('brand', 'model', 'category', 'variant', 'payment_method'));

create table public.purchase_order_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in (
    'created',
    'payment_recorded',
    'marked_in_transit',
    'received_complete',
    'received_progress',
    'received_incomplete_closed',
    'note_added',
    'canceled'
  )),
  from_status purchase_order_status,
  to_status purchase_order_status,
  amount numeric(12,2) check (amount is null or amount >= 0),
  payment_method_id uuid references public.catalog_items(id) on delete restrict,
  payment_method_name text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.purchase_order_events enable row level security;

create policy "order events isolated by tenant" on public.purchase_order_events
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index purchase_order_events_order_created_idx
on public.purchase_order_events (tenant_id, purchase_order_id, created_at desc);

create index purchase_order_events_payment_method_idx
on public.purchase_order_events (tenant_id, payment_method_id)
where payment_method_id is not null;
