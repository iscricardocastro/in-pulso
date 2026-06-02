create or replace function public.prevent_inventory_audit_category_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_conflict public.inventory_audits;
begin
  if new.status <> 'open' then
    return new;
  end if;

  select * into v_conflict
  from public.inventory_audits
  where tenant_id = new.tenant_id
    and status = 'open'
    and id <> new.id
    and category_ids && new.category_ids
  limit 1;

  if found then
    raise exception 'category already has open audit: %', v_conflict.audit_number;
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_audit_category_overlap_guard on public.inventory_audits;

create trigger inventory_audit_category_overlap_guard
before insert or update of status, category_ids on public.inventory_audits
for each row execute function public.prevent_inventory_audit_category_overlap();
