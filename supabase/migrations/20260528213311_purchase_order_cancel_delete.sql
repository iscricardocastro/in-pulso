alter type public.purchase_order_status add value if not exists 'canceled';

alter table public.purchase_order_events
drop constraint if exists purchase_order_events_type_check;

alter table public.purchase_order_events
add constraint purchase_order_events_type_check
check (type in (
  'created',
  'payment_recorded',
  'marked_in_transit',
  'received_complete',
  'received_progress',
  'received_incomplete_closed',
  'note_added',
  'canceled'
));
