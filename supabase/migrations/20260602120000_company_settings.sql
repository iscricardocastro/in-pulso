alter table public.tenants
add column if not exists legal_name text,
add column if not exists tax_id text,
add column if not exists phone text,
add column if not exists email text,
add column if not exists address text,
add column if not exists city text,
add column if not exists state text,
add column if not exists country text,
add column if not exists image_url text,
add column if not exists image_path text;

do $$
begin
  create policy "tenant update by members" on public.tenants
  for update using (id = public.current_tenant_id())
  with check (id = public.current_tenant_id());
exception
  when duplicate_object then null;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-images',
  'company-images',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "company images visible" on storage.objects
for select using (bucket_id = 'company-images');

create policy "company images upload by tenant members" on storage.objects
for insert with check (
  bucket_id = 'company-images'
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
);

create policy "company images update by tenant members" on storage.objects
for update using (
  bucket_id = 'company-images'
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
)
with check (
  bucket_id = 'company-images'
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
);

create policy "company images delete by tenant members" on storage.objects
for delete using (
  bucket_id = 'company-images'
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
);
