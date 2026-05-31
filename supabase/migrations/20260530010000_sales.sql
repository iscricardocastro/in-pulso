create type sale_status as enum ('completed', 'partially_refunded', 'refunded', 'canceled');
create type discount_type as enum ('amount', 'percent');

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  sale_number text not null,
  status sale_status not null default 'completed',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_type discount_type,
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sale_number)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_code text not null,
  quantity integer not null check (quantity > 0),
  suggested_price numeric(12,2) not null default 0 check (suggested_price >= 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  discount_type discount_type,
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  refunded_quantity integer not null default 0 check (refunded_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refunded_quantity <= quantity)
);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  payment_method_id uuid not null references public.catalog_items(id) on delete restrict,
  payment_method_name text not null,
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
  change_due numeric(12,2) not null default 0 check (change_due >= 0),
  comments text,
  created_at timestamptz not null default now()
);

create table public.sale_refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  payment_method_id uuid not null references public.catalog_items(id) on delete restrict,
  payment_method_name text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  affect_inventory boolean not null default true,
  comments text,
  created_at timestamptz not null default now()
);

create table public.sale_refund_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  refund_id uuid not null references public.sale_refunds(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create table public.sale_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('created', 'updated', 'canceled', 'refunded')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger sales_updated_at before update on public.sales for each row execute function public.set_updated_at();
create trigger sale_items_updated_at before update on public.sale_items for each row execute function public.set_updated_at();

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.sale_refunds enable row level security;
alter table public.sale_refund_items enable row level security;
alter table public.sale_events enable row level security;

create policy "sales isolated by tenant" on public.sales
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "sale items isolated by tenant" on public.sale_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "sale payments isolated by tenant" on public.sale_payments
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "sale refunds isolated by tenant" on public.sale_refunds
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "sale refund items isolated by tenant" on public.sale_refund_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "sale events isolated by tenant" on public.sale_events
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index sales_tenant_created_idx on public.sales (tenant_id, created_at desc);
create index sales_tenant_customer_idx on public.sales (tenant_id, customer_id) where customer_id is not null;
create index sale_items_tenant_sale_idx on public.sale_items (tenant_id, sale_id);
create index sale_items_tenant_product_idx on public.sale_items (tenant_id, product_id);
create index sale_payments_tenant_sale_idx on public.sale_payments (tenant_id, sale_id);
create index sale_refunds_tenant_sale_idx on public.sale_refunds (tenant_id, sale_id);
create index sale_refund_items_tenant_refund_idx on public.sale_refund_items (tenant_id, refund_id);
create index sale_events_tenant_sale_idx on public.sale_events (tenant_id, sale_id, created_at desc);
