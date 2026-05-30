alter table public.catalog_items
add column if not exists parent_id uuid references public.catalog_items(id) on delete cascade;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'brand', brand
from public.products
where brand is not null and btrim(brand) <> ''
on conflict do nothing;

with product_model_brands as (
  select
    tenant_id,
    btrim(model) as model_name,
    min(btrim(brand)) as brand_name,
    count(distinct btrim(brand)) as brand_count
  from public.products
  where model is not null
    and btrim(model) <> ''
    and brand is not null
    and btrim(brand) <> ''
  group by tenant_id, btrim(model)
),
single_brand_models as (
  select tenant_id, model_name, brand_name
  from product_model_brands
  where brand_count = 1
),
brand_items as (
  select id, tenant_id, name
  from public.catalog_items
  where kind = 'brand'
)
update public.catalog_items as model_item
set parent_id = brand_items.id
from single_brand_models
join brand_items
  on brand_items.tenant_id = single_brand_models.tenant_id
  and brand_items.name = single_brand_models.brand_name
where model_item.tenant_id = single_brand_models.tenant_id
  and model_item.kind = 'model'
  and model_item.name = single_brand_models.model_name
  and model_item.parent_id is null;

create unique index if not exists catalog_items_global_unique_idx
on public.catalog_items (tenant_id, kind, name)
where parent_id is null;

create unique index if not exists catalog_items_child_unique_idx
on public.catalog_items (tenant_id, kind, parent_id, name)
where parent_id is not null;

alter table public.catalog_items
drop constraint if exists catalog_items_tenant_id_kind_name_key;

create index if not exists catalog_items_parent_idx
on public.catalog_items (tenant_id, parent_id);
