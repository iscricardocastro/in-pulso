create extension if not exists "pgcrypto";

create type movement_type as enum ('entry', 'exit', 'adjustment');
create type purchase_order_status as enum ('draft', 'quoted', 'partially_paid', 'paid', 'in_transit', 'received', 'canceled');
create type stock_alert_status as enum ('open', 'resolved');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid generated always as (id) stored,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  contact text,
  phone text,
  email text,
  country text,
  average_delivery_days integer not null default 0 check (average_delivery_days >= 0),
  payment_terms text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.customers (
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

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  internal_code text not null,
  name text not null,
  brand text,
  model text,
  category text,
  variant text,
  brand_id uuid,
  model_id uuid,
  category_id uuid,
  variant_id uuid,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  suggested_price numeric(12,2) check (suggested_price is null or suggested_price >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  primary_supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, internal_code)
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  parent_id uuid references public.catalog_items(id) on delete cascade,
  kind text not null check (kind in ('brand', 'model', 'category', 'variant', 'payment_method')),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add constraint products_brand_id_fkey foreign key (brand_id) references public.catalog_items(id) on delete restrict,
add constraint products_model_id_fkey foreign key (model_id) references public.catalog_items(id) on delete restrict,
add constraint products_category_id_fkey foreign key (category_id) references public.catalog_items(id) on delete restrict,
add constraint products_variant_id_fkey foreign key (variant_id) references public.catalog_items(id) on delete restrict;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type movement_type not null,
  quantity integer not null check (quantity > 0),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_number text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier text,
  status purchase_order_status not null default 'draft',
  expected_arrival date,
  advance_percent numeric(5,2) not null default 0 check (advance_percent >= 0 and advance_percent <= 100),
  advance_paid numeric(12,2) not null default 0 check (advance_paid >= 0),
  estimated_total numeric(12,2) not null default 0 check (estimated_total >= 0),
  expected_items jsonb not null default '[]'::jsonb,
  received_items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_number)
);

create table public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status stock_alert_status not null default 'open',
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, product_id, status)
);

create table public.purchase_order_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('created', 'payment_recorded', 'marked_in_transit', 'received_complete', 'received_progress', 'received_incomplete_closed', 'note_added', 'canceled')),
  from_status purchase_order_status,
  to_status purchase_order_status,
  amount numeric(12,2) check (amount is null or amount >= 0),
  payment_method_id uuid references public.catalog_items(id) on delete restrict,
  payment_method_name text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger catalog_items_updated_at before update on public.catalog_items for each row execute function public.set_updated_at();
create trigger inventory_movements_updated_at before update on public.inventory_movements for each row execute function public.set_updated_at();
create trigger purchase_orders_updated_at before update on public.purchase_orders for each row execute function public.set_updated_at();
create trigger stock_alerts_updated_at before update on public.stock_alerts for each row execute function public.set_updated_at();

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

create or replace function public.next_product_code(p_tenant_id uuid)
returns text
language sql
stable
as $$
  select 'P' || lpad((coalesce(max(substring(internal_code from 2)::integer), 0) + 1)::text, 6, '0')
  from public.products
  where tenant_id = p_tenant_id and internal_code ~ '^P[0-9]{6}$'
$$;

create or replace function public.sync_stock_alert()
returns trigger language plpgsql as $$
begin
  if new.current_stock <= new.minimum_stock then
    insert into public.stock_alerts (tenant_id, product_id, status, message)
    values (
      new.tenant_id,
      new.id,
      'open',
      case when new.current_stock = 0 then 'Producto agotado' else 'Stock bajo' end
    )
    on conflict (tenant_id, product_id, status)
    do update set message = excluded.message, updated_at = now();
  else
    delete from public.stock_alerts
    where tenant_id = new.tenant_id and product_id = new.id and status = 'open';

    insert into public.stock_alerts (tenant_id, product_id, status, message)
    values (new.tenant_id, new.id, 'resolved', 'Stock normalizado')
    on conflict (tenant_id, product_id, status)
    do update set message = excluded.message, updated_at = now();
  end if;
  return new;
end;
$$;

create trigger products_sync_alert
after insert or update of current_stock, minimum_stock on public.products
for each row execute function public.sync_stock_alert();

create or replace function public.record_inventory_movement(
  p_product_id uuid,
  p_type movement_type,
  p_quantity integer,
  p_comment text default null
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_user_id uuid := auth.uid();
  v_product public.products;
  v_movement public.inventory_movements;
  v_next_stock integer;
begin
  if v_tenant_id is null or v_user_id is null then
    raise exception 'auth required';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and tenant_id = v_tenant_id
  for update;

  if not found then
    raise exception 'product not found';
  end if;

  if p_quantity <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  if p_type = 'entry' then
    v_next_stock := v_product.current_stock + p_quantity;
  elsif p_type = 'exit' then
    v_next_stock := v_product.current_stock - p_quantity;
  else
    v_next_stock := p_quantity;
  end if;

  if v_next_stock < 0 then
    raise exception 'stock cannot be negative';
  end if;

  update public.products
  set current_stock = v_next_stock
  where id = p_product_id and tenant_id = v_tenant_id;

  insert into public.inventory_movements (tenant_id, product_id, user_id, type, quantity, comment)
  values (v_tenant_id, p_product_id, v_user_id, p_type, p_quantity, p_comment)
  returning * into v_movement;

  return v_movement;
end;
$$;

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.catalog_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.stock_alerts enable row level security;
alter table public.purchase_order_events enable row level security;

create policy "tenant visible to members" on public.tenants
for select using (id = public.current_tenant_id());

create policy "users isolated by tenant" on public.users
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "suppliers isolated by tenant" on public.suppliers
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "customers isolated by tenant" on public.customers
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "products isolated by tenant" on public.products
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "catalog items isolated by tenant" on public.catalog_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "movements isolated by tenant" on public.inventory_movements
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "orders isolated by tenant" on public.purchase_orders
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "alerts isolated by tenant" on public.stock_alerts
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "order events isolated by tenant" on public.purchase_order_events
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index products_tenant_stock_idx on public.products (tenant_id, current_stock, minimum_stock);
create index products_primary_supplier_idx on public.products (tenant_id, primary_supplier_id);
create index products_catalog_ids_idx on public.products (tenant_id, brand_id, model_id, category_id, variant_id);
create index suppliers_tenant_name_idx on public.suppliers (tenant_id, name);
create index customers_tenant_name_idx on public.customers (tenant_id, name);
create index customers_tenant_postal_code_idx on public.customers (tenant_id, postal_code);
create index catalog_items_tenant_kind_name_idx on public.catalog_items (tenant_id, kind, name);
create unique index catalog_items_global_unique_idx on public.catalog_items (tenant_id, kind, name) where parent_id is null;
create unique index catalog_items_child_unique_idx on public.catalog_items (tenant_id, kind, parent_id, name) where parent_id is not null;
create index catalog_items_parent_idx on public.catalog_items (tenant_id, parent_id);
create index movements_tenant_created_idx on public.inventory_movements (tenant_id, created_at desc);
create index orders_tenant_arrival_idx on public.purchase_orders (tenant_id, expected_arrival);
create index orders_supplier_idx on public.purchase_orders (tenant_id, supplier_id);
create index purchase_order_events_order_created_idx on public.purchase_order_events (tenant_id, purchase_order_id, created_at desc);
create index purchase_order_events_payment_method_idx on public.purchase_order_events (tenant_id, payment_method_id) where payment_method_id is not null;
