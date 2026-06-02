create or replace function public.count_inventory_audit_item(
  p_audit_id uuid,
  p_item_id uuid,
  p_mode text,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_item public.inventory_audit_items;
  v_counted_quantity integer;
  v_summary record;
begin
  if v_tenant_id is null or auth.uid() is null then
    raise exception 'auth required';
  end if;

  if p_mode not in ('add', 'set') then
    raise exception 'invalid count mode';
  end if;

  if p_quantity < 0 then
    raise exception 'quantity must be zero or greater';
  end if;

  select i.* into v_item
  from public.inventory_audit_items i
  join public.inventory_audits a on a.id = i.audit_id
  where i.id = p_item_id
    and i.audit_id = p_audit_id
    and i.tenant_id = v_tenant_id
    and a.tenant_id = v_tenant_id
    and a.status = 'open'
  for update of i;

  if not found then
    raise exception 'audit item not found';
  end if;

  if p_mode = 'add' then
    v_counted_quantity := coalesce(v_item.counted_quantity, 0) + p_quantity;
  else
    v_counted_quantity := p_quantity;
  end if;

  update public.inventory_audit_items
  set
    counted = true,
    counted_quantity = v_counted_quantity,
    difference = v_counted_quantity - initial_stock
  where id = p_item_id
    and audit_id = p_audit_id
    and tenant_id = v_tenant_id
  returning * into v_item;

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
    total_items = v_summary.total_items,
    counted_items = v_summary.counted_items,
    expected_pieces = v_summary.expected_pieces,
    counted_pieces = v_summary.counted_pieces,
    positive_difference = v_summary.positive_difference,
    negative_difference = v_summary.negative_difference
  where id = p_audit_id
    and tenant_id = v_tenant_id;

  return jsonb_build_object(
    'item', to_jsonb(v_item),
    'summary', jsonb_build_object(
      'totalItems', v_summary.total_items,
      'countedItems', v_summary.counted_items,
      'expectedPieces', v_summary.expected_pieces,
      'countedPieces', v_summary.counted_pieces,
      'positiveDifference', v_summary.positive_difference,
      'negativeDifference', v_summary.negative_difference
    )
  );
end;
$$;
