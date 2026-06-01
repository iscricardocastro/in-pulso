create type inventory_audit_status as enum ('open', 'closed', 'canceled');

create table public.inventory_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  audit_number text not null,
  status inventory_audit_status not null default 'open',
  category_ids uuid[] not null default '{}'::uuid[],
  category_names text[] not null default '{}'::text[],
  notes text,
  apply_inventory boolean not null default false,
  uncounted_policy text not null default 'ignore' check (uncounted_policy in ('ignore', 'zero')),
  total_items integer not null default 0 check (total_items >= 0),
  counted_items integer not null default 0 check (counted_items >= 0),
  expected_pieces integer not null default 0 check (expected_pieces >= 0),
  counted_pieces integer not null default 0 check (counted_pieces >= 0),
  positive_difference integer not null default 0 check (positive_difference >= 0),
  negative_difference integer not null default 0 check (negative_difference >= 0),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, audit_number)
);

create table public.inventory_audit_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  audit_id uuid not null references public.inventory_audits(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_code text not null,
  product_name text not null,
  brand text,
  model text,
  category text,
  initial_stock integer not null check (initial_stock >= 0),
  closing_stock integer check (closing_stock is null or closing_stock >= 0),
  counted_quantity integer check (counted_quantity is null or counted_quantity >= 0),
  difference integer not null default 0,
  counted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, audit_id, product_id)
);

create trigger inventory_audits_updated_at before update on public.inventory_audits for each row execute function public.set_updated_at();
create trigger inventory_audit_items_updated_at before update on public.inventory_audit_items for each row execute function public.set_updated_at();

alter table public.inventory_audits enable row level security;
alter table public.inventory_audit_items enable row level security;

create policy "inventory audits isolated by tenant" on public.inventory_audits
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "inventory audit items isolated by tenant" on public.inventory_audit_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index inventory_audits_tenant_created_idx on public.inventory_audits (tenant_id, created_at desc);
create index inventory_audits_tenant_status_idx on public.inventory_audits (tenant_id, status);
create index inventory_audit_items_audit_idx on public.inventory_audit_items (tenant_id, audit_id);
create index inventory_audit_items_product_idx on public.inventory_audit_items (tenant_id, product_id);

create or replace function public.next_inventory_audit_number(p_tenant_id uuid)
returns text
language sql
stable
as $$
  select 'INV-' || lpad((coalesce(max(substring(audit_number from 5)::integer), 0) + 1)::text, 6, '0')
  from public.inventory_audits
  where tenant_id = p_tenant_id and audit_number ~ '^INV-[0-9]{6}$'
$$;

alter table public.inventory_movements
drop constraint if exists inventory_movements_quantity_check;

alter table public.inventory_movements
add constraint inventory_movements_quantity_valid
check (
  (type = 'adjustment' and quantity >= 0)
  or (type <> 'adjustment' and quantity > 0)
);

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

  if p_type = 'adjustment' and p_quantity < 0 then
    raise exception 'quantity must be zero or greater';
  elsif p_type <> 'adjustment' and p_quantity <= 0 then
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
