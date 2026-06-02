create type service_note_status as enum ('received', 'in_progress', 'ready', 'delivered', 'canceled');

create table public.service_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  fields jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.service_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  template_id uuid references public.service_templates(id) on delete set null,
  note_number text not null,
  status service_note_status not null default 'received',
  device_fields jsonb not null default '{}'::jsonb,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_type discount_type,
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  paid_total numeric(12,2) not null default 0 check (paid_total >= 0),
  balance_due numeric(12,2) not null default 0 check (balance_due >= 0),
  inventory_applied boolean not null default false,
  notes text,
  delivered_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, note_number)
);

create table public.service_note_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_note_id uuid not null references public.service_notes(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  item_type text not null default 'service' check (item_type in ('service', 'part')),
  description text not null,
  product_code text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_note_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_note_id uuid not null references public.service_notes(id) on delete cascade,
  payment_method_id uuid not null references public.catalog_items(id) on delete restrict,
  payment_method_name text not null,
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  comments text,
  created_at timestamptz not null default now()
);

create table public.service_note_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_note_id uuid not null references public.service_notes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('created', 'updated', 'payment_recorded', 'status_changed', 'delivered', 'canceled')),
  from_status service_note_status,
  to_status service_note_status,
  amount numeric(12,2) check (amount is null or amount >= 0),
  payment_method_id uuid references public.catalog_items(id) on delete restrict,
  payment_method_name text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger service_templates_updated_at before update on public.service_templates for each row execute function public.set_updated_at();
create trigger service_notes_updated_at before update on public.service_notes for each row execute function public.set_updated_at();
create trigger service_note_items_updated_at before update on public.service_note_items for each row execute function public.set_updated_at();

alter table public.service_templates enable row level security;
alter table public.service_notes enable row level security;
alter table public.service_note_items enable row level security;
alter table public.service_note_payments enable row level security;
alter table public.service_note_events enable row level security;

create policy "service templates isolated by tenant" on public.service_templates
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "service notes isolated by tenant" on public.service_notes
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "service note items isolated by tenant" on public.service_note_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "service note payments isolated by tenant" on public.service_note_payments
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "service note events isolated by tenant" on public.service_note_events
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index service_templates_tenant_active_idx on public.service_templates (tenant_id, active, name);
create index service_notes_tenant_created_idx on public.service_notes (tenant_id, created_at desc);
create index service_notes_tenant_customer_idx on public.service_notes (tenant_id, customer_id) where customer_id is not null;
create index service_notes_tenant_status_idx on public.service_notes (tenant_id, status);
create index service_note_items_note_idx on public.service_note_items (tenant_id, service_note_id);
create index service_note_items_product_idx on public.service_note_items (tenant_id, product_id) where product_id is not null;
create index service_note_payments_note_idx on public.service_note_payments (tenant_id, service_note_id);
create index service_note_events_note_created_idx on public.service_note_events (tenant_id, service_note_id, created_at desc);

insert into public.service_templates (tenant_id, name, fields)
select id, 'Reparacion general', '[
  {"key":"brand","label":"Marca"},
  {"key":"model","label":"Modelo"},
  {"key":"serial","label":"Serie/IMEI"},
  {"key":"issue","label":"Falla reportada"},
  {"key":"accessories","label":"Accesorios"},
  {"key":"condition","label":"Condiciones"}
]'::jsonb
from public.tenants
on conflict (tenant_id, name) do nothing;
