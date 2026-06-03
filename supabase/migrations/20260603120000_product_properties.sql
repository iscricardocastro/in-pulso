create type product_property_type as enum ('text', 'number', 'date', 'boolean', 'option');

alter table public.products
add column if not exists properties jsonb not null default '{}'::jsonb;

create table if not exists public.product_property_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  label text not null,
  type product_property_type not null default 'text',
  required boolean not null default false,
  searchable boolean not null default true,
  filterable boolean not null default true,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, key),
  check (key ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.product_property_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  definition_id uuid not null references public.product_property_definitions(id) on delete cascade,
  value text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, definition_id, value)
);

create table if not exists public.product_import_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  mapping jsonb not null default '{}'::jsonb,
  header_row integer not null default 1 check (header_row >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

drop trigger if exists product_property_definitions_updated_at on public.product_property_definitions;
create trigger product_property_definitions_updated_at
before update on public.product_property_definitions
for each row execute function public.set_updated_at();

drop trigger if exists product_property_options_updated_at on public.product_property_options;
create trigger product_property_options_updated_at
before update on public.product_property_options
for each row execute function public.set_updated_at();

drop trigger if exists product_import_templates_updated_at on public.product_import_templates;
create trigger product_import_templates_updated_at
before update on public.product_import_templates
for each row execute function public.set_updated_at();

alter table public.product_property_definitions enable row level security;
alter table public.product_property_options enable row level security;
alter table public.product_import_templates enable row level security;

drop policy if exists "product property definitions isolated by tenant" on public.product_property_definitions;
create policy "product property definitions isolated by tenant" on public.product_property_definitions
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists "product property options isolated by tenant" on public.product_property_options;
create policy "product property options isolated by tenant" on public.product_property_options
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists "product import templates isolated by tenant" on public.product_import_templates;
create policy "product import templates isolated by tenant" on public.product_import_templates
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index if not exists product_property_definitions_tenant_active_idx
on public.product_property_definitions (tenant_id, active, display_order, label);

create index if not exists product_property_options_definition_idx
on public.product_property_options (tenant_id, definition_id, active, value);

insert into public.product_property_definitions (tenant_id, key, label, type, required, searchable, filterable, display_order, active)
select tenant_id, key, label, 'option'::product_property_type, false, true, true, display_order, true
from (
  select distinct tenant_id, 'brand' as key, 'Marca' as label, 10 as display_order from public.products
  union
  select distinct tenant_id, 'model' as key, 'Modelo' as label, 20 as display_order from public.products
  union
  select distinct tenant_id, 'category' as key, 'Categoria' as label, 30 as display_order from public.products
  union
  select distinct tenant_id, 'variant' as key, 'Variante / Calidad' as label, 40 as display_order from public.products
) defaults
on conflict (tenant_id, key) do nothing;

update public.products
set properties = properties
  || jsonb_strip_nulls(jsonb_build_object(
    'brand', nullif(btrim(coalesce(brand, '')), ''),
    'model', nullif(btrim(coalesce(model, '')), ''),
    'category', nullif(btrim(coalesce(category, '')), ''),
    'variant', nullif(btrim(coalesce(variant, '')), '')
  ));

insert into public.product_property_options (tenant_id, definition_id, value)
select distinct product.tenant_id, definition.id, btrim(value)
from public.products product
join public.product_property_definitions definition
  on definition.tenant_id = product.tenant_id
  and definition.key = 'brand'
cross join lateral (values (product.brand)) as source(value)
where source.value is not null and btrim(source.value) <> ''
on conflict (tenant_id, definition_id, value) do nothing;

insert into public.product_property_options (tenant_id, definition_id, value)
select distinct product.tenant_id, definition.id, btrim(value)
from public.products product
join public.product_property_definitions definition
  on definition.tenant_id = product.tenant_id
  and definition.key = 'model'
cross join lateral (values (product.model)) as source(value)
where source.value is not null and btrim(source.value) <> ''
on conflict (tenant_id, definition_id, value) do nothing;

insert into public.product_property_options (tenant_id, definition_id, value)
select distinct product.tenant_id, definition.id, btrim(value)
from public.products product
join public.product_property_definitions definition
  on definition.tenant_id = product.tenant_id
  and definition.key = 'category'
cross join lateral (values (product.category)) as source(value)
where source.value is not null and btrim(source.value) <> ''
on conflict (tenant_id, definition_id, value) do nothing;

insert into public.product_property_options (tenant_id, definition_id, value)
select distinct product.tenant_id, definition.id, btrim(value)
from public.products product
join public.product_property_definitions definition
  on definition.tenant_id = product.tenant_id
  and definition.key = 'variant'
cross join lateral (values (product.variant)) as source(value)
where source.value is not null and btrim(source.value) <> ''
on conflict (tenant_id, definition_id, value) do nothing;

notify pgrst, 'reload schema';
