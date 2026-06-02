create or replace function public.close_inventory_audit(
  p_audit_id uuid,
  p_apply_inventory boolean default true,
  p_uncounted_policy text default 'ignore'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_user_id uuid := auth.uid();
  v_audit public.inventory_audits;
  v_summary record;
begin
  if v_tenant_id is null or v_user_id is null then
    raise exception 'auth required';
  end if;

  if p_uncounted_policy not in ('ignore', 'zero') then
    raise exception 'invalid uncounted policy';
  end if;

  select * into v_audit
  from public.inventory_audits
  where id = p_audit_id
    and tenant_id = v_tenant_id
    and status = 'open'
  for update;

  if not found then
    raise exception 'open audit not found';
  end if;

  if p_uncounted_policy = 'zero' then
    update public.inventory_audit_items
    set
      counted = true,
      counted_quantity = 0,
      difference = -initial_stock
    where tenant_id = v_tenant_id
      and audit_id = p_audit_id
      and counted = false;
  end if;

  perform 1
  from public.products p
  join public.inventory_audit_items i on i.product_id = p.id
  where i.tenant_id = v_tenant_id
    and i.audit_id = p_audit_id
    and p.tenant_id = v_tenant_id
  for update of p;

  update public.inventory_audit_items i
  set closing_stock = p.current_stock
  from public.products p
  where i.tenant_id = v_tenant_id
    and i.audit_id = p_audit_id
    and p.id = i.product_id
    and p.tenant_id = v_tenant_id;

  if p_apply_inventory then
    insert into public.inventory_movements (tenant_id, product_id, user_id, type, quantity, comment)
    select
      v_tenant_id,
      i.product_id,
      v_user_id,
      'adjustment',
      i.counted_quantity,
      'Conteo ' || v_audit.audit_number || ': ' || i.product_name || ', stock ' || i.closing_stock || ' -> ' || i.counted_quantity
    from public.inventory_audit_items i
    where i.tenant_id = v_tenant_id
      and i.audit_id = p_audit_id
      and i.counted = true
      and i.counted_quantity is not null
      and i.closing_stock is not null
      and i.counted_quantity <> i.closing_stock;

    update public.products p
    set current_stock = i.counted_quantity
    from public.inventory_audit_items i
    where i.tenant_id = v_tenant_id
      and i.audit_id = p_audit_id
      and i.product_id = p.id
      and p.tenant_id = v_tenant_id
      and i.counted = true
      and i.counted_quantity is not null
      and i.closing_stock is not null
      and i.counted_quantity <> i.closing_stock;
  end if;

  select
    count(*)::integer as total_items,
    count(*) filter (where counted and counted_quantity is not null)::integer as counted_items,
    coalesce(sum(initial_stock), 0)::integer as expected_pieces,
    coalesce(sum(counted_quantity) filter (where counted and counted_quantity is not null), 0)::integer as counted_pieces,
    coalesce(sum(greatest(counted_quantity - initial_stock, 0)) filter (where counted and counted_quantity is not null), 0)::integer as positive_difference,
    coalesce(sum(greatest(initial_stock - counted_quantity, 0)) filter (where counted and counted_quantity is not null), 0)::integer as negative_difference
  into v_summary
  from public.inventory_audit_items
  where tenant_id = v_tenant_id
    and audit_id = p_audit_id;

  update public.inventory_audits
  set
    status = 'closed',
    apply_inventory = p_apply_inventory,
    uncounted_policy = p_uncounted_policy,
    total_items = v_summary.total_items,
    counted_items = v_summary.counted_items,
    expected_pieces = v_summary.expected_pieces,
    counted_pieces = v_summary.counted_pieces,
    positive_difference = v_summary.positive_difference,
    negative_difference = v_summary.negative_difference,
    closed_at = now()
  where id = p_audit_id
    and tenant_id = v_tenant_id;

  return v_audit.audit_number;
end;
$$;
