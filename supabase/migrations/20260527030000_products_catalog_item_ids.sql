alter table public.products
add column if not exists brand_id uuid references public.catalog_items(id) on delete restrict,
add column if not exists model_id uuid references public.catalog_items(id) on delete restrict,
add column if not exists category_id uuid references public.catalog_items(id) on delete restrict,
add column if not exists variant_id uuid references public.catalog_items(id) on delete restrict;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'brand', btrim(brand)
from public.products
where brand is not null and btrim(brand) <> ''
on conflict do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'category', btrim(category)
from public.products
where category is not null and btrim(category) <> ''
on conflict do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'variant', btrim(variant)
from public.products
where variant is not null and btrim(variant) <> ''
on conflict do nothing;

update public.products as product
set brand_id = catalog.id
from public.catalog_items as catalog
where product.brand_id is null
  and catalog.tenant_id = product.tenant_id
  and catalog.kind = 'brand'
  and catalog.parent_id is null
  and catalog.name = btrim(product.brand);

update public.products as product
set category_id = catalog.id
from public.catalog_items as catalog
where product.category_id is null
  and catalog.tenant_id = product.tenant_id
  and catalog.kind = 'category'
  and catalog.parent_id is null
  and catalog.name = btrim(product.category);

update public.products as product
set variant_id = catalog.id
from public.catalog_items as catalog
where product.variant_id is null
  and catalog.tenant_id = product.tenant_id
  and catalog.kind = 'variant'
  and catalog.parent_id is null
  and catalog.name = btrim(product.variant);

insert into public.catalog_items (tenant_id, parent_id, kind, name)
select distinct product.tenant_id, brand.id, 'model', btrim(product.model)
from public.products as product
join public.catalog_items as brand
  on brand.tenant_id = product.tenant_id
  and brand.kind = 'brand'
  and brand.parent_id is null
  and brand.name = btrim(product.brand)
where product.model is not null
  and btrim(product.model) <> ''
  and product.brand is not null
  and btrim(product.brand) <> ''
on conflict do nothing;

update public.products as product
set model_id = catalog.id
from public.catalog_items as catalog
where product.model_id is null
  and product.brand_id is not null
  and catalog.tenant_id = product.tenant_id
  and catalog.kind = 'model'
  and catalog.parent_id = product.brand_id
  and catalog.name = btrim(product.model);

create index if not exists products_catalog_ids_idx
on public.products (tenant_id, brand_id, model_id, category_id, variant_id);
