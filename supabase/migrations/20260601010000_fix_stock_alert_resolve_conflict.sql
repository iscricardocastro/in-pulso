create or replace function public.sync_stock_alert()
returns trigger language plpgsql as $$
begin
  if new.current_stock <= new.minimum_stock then
    insert into public.stock_alerts (tenant_id, product_id, status, message)
    values (
      new.tenant_id,
      new.id,
      'open',
      case when new.current_stock = 0 then 'Producto agotado' else 'Stock bajo' end
    )
    on conflict (tenant_id, product_id, status)
    do update set message = excluded.message, updated_at = now();
  else
    delete from public.stock_alerts
    where tenant_id = new.tenant_id and product_id = new.id and status = 'open';

    insert into public.stock_alerts (tenant_id, product_id, status, message)
    values (new.tenant_id, new.id, 'resolved', 'Stock normalizado')
    on conflict (tenant_id, product_id, status)
    do update set message = excluded.message, updated_at = now();
  end if;
  return new;
end;
$$;
