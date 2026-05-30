insert into public.tenants (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'InMexico Demo', 'inmexico-demo')
on conflict (slug) do nothing;

insert into public.suppliers (
  id, tenant_id, name, contact, phone, email, country, average_delivery_days, payment_terms, notes
) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mobile Parts MX', 'Laura Perez', '+52 81 0000 0001', 'ventas@mobileparts.mx', 'Mexico', 3, '50% anticipo, 50% entrega', 'Proveedor principal de pantallas'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CellFix Supply', 'Marco Ruiz', '+52 55 0000 0002', 'compras@cellfix.mx', 'Mexico', 5, 'Pago completo previo envio', 'Buen surtido de baterias'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Tech Mayorista', 'Ana Soto', '+52 33 0000 0003', 'hola@techmayorista.mx', 'Mexico', 2, 'Credito 7 dias', null)
on conflict (tenant_id, name) do nothing;

insert into public.products (
  tenant_id, internal_code, name, brand, model, category, variant,
  cost, sale_price, suggested_price, current_stock, minimum_stock, primary_supplier_id, notes
) values
('00000000-0000-0000-0000-000000000001', 'P000001', 'Pantalla OLED iPhone 13', 'Apple', 'iPhone 13', 'Pantallas', 'Negro', 950, 1499, 1499, 3, 5, '10000000-0000-0000-0000-000000000001', 'Alta rotacion'),
('00000000-0000-0000-0000-000000000001', 'P000002', 'Bateria iPhone 11', 'Apple', 'iPhone 11', 'Baterias', 'Original quality', 280, 599, 599, 0, 4, '10000000-0000-0000-0000-000000000002', 'Revisar lote al recibir'),
('00000000-0000-0000-0000-000000000001', 'P000003', 'Centro de carga Samsung A52', 'Samsung', 'Galaxy A52', 'Carga', 'USB-C', 95, 249, 249, 12, 6, '10000000-0000-0000-0000-000000000003', null),
('00000000-0000-0000-0000-000000000001', 'P000004', 'Camara trasera Redmi Note 10', 'Xiaomi', 'Redmi Note 10', 'Camaras', '48MP', 180, 399, 399, 2, 3, '10000000-0000-0000-0000-000000000001', null)
on conflict (tenant_id, internal_code) do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'brand', brand from public.products where brand is not null and btrim(brand) <> ''
on conflict do nothing;

insert into public.catalog_items (tenant_id, parent_id, kind, name)
select distinct products.tenant_id, brands.id, 'model', products.model
from public.products
join public.catalog_items as brands
  on brands.tenant_id = products.tenant_id
  and brands.kind = 'brand'
  and brands.name = products.brand
where products.model is not null and btrim(products.model) <> ''
  and products.brand is not null and btrim(products.brand) <> ''
on conflict do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'category', category from public.products where category is not null and btrim(category) <> ''
on conflict do nothing;

insert into public.catalog_items (tenant_id, kind, name)
select distinct tenant_id, 'variant', variant from public.products where variant is not null and btrim(variant) <> ''
on conflict do nothing;

update public.products as product
set brand_id = catalog.id
from public.catalog_items as catalog
where catalog.tenant_id = product.tenant_id
  and catalog.kind = 'brand'
  and catalog.parent_id is null
  and catalog.name = product.brand;

update public.products as product
set model_id = catalog.id
from public.catalog_items as catalog
where product.brand_id is not null
  and catalog.tenant_id = product.tenant_id
  and catalog.kind = 'model'
  and catalog.parent_id = product.brand_id
  and catalog.name = product.model;

update public.products as product
set category_id = catalog.id
from public.catalog_items as catalog
where catalog.tenant_id = product.tenant_id
  and catalog.kind = 'category'
  and catalog.parent_id is null
  and catalog.name = product.category;

update public.products as product
set variant_id = catalog.id
from public.catalog_items as catalog
where catalog.tenant_id = product.tenant_id
  and catalog.kind = 'variant'
  and catalog.parent_id is null
  and catalog.name = product.variant;

insert into public.purchase_orders (
  tenant_id, order_number, supplier_id, supplier, status, expected_arrival,
  advance_percent, advance_paid, estimated_total, expected_items, received_items, notes
) values (
  '00000000-0000-0000-0000-000000000001',
  'PO-000001',
  '10000000-0000-0000-0000-000000000001',
  'Mobile Parts MX',
  'in_transit',
  current_date + interval '2 days',
  50,
  4750,
  9500,
  '[{"product_id":"00000000-0000-0000-0000-000000000000","quantity_requested":10,"unit_cost":950,"received_quantity":0}]'::jsonb,
  '[]'::jsonb,
  'Pedido semilla: reemplazar product_id desde UI si se usa local.'
) on conflict (tenant_id, order_number) do nothing;
