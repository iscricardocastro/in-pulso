create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('brand', 'model', 'category', 'variant')),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, kind, name)
);

drop trigger if exists catalog_items_updated_at on public.catalog_items;
create trigger catalog_items_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

alter table public.catalog_items enable row level security;

drop policy if exists "catalog items isolated by tenant" on public.catalog_items;
create policy "catalog items isolated by tenant" on public.catalog_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create index if not exists catalog_items_tenant_kind_name_idx
on public.catalog_items (tenant_id, kind, name);

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'brand', brand
from public.products
where brand is not null and btrim(brand) <> ''
on conflict (tenant_id, kind, name) do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'model', model
from public.products
where model is not null and btrim(model) <> ''
on conflict (tenant_id, kind, name) do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'category', category
from public.products
where category is not null and btrim(category) <> ''
on conflict (tenant_id, kind, name) do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'variant', variant
from public.products
where variant is not null and btrim(variant) <> ''
on conflict (tenant_id, kind, name) do nothing;
