alter table public.service_note_payments
add column amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
add column change_due numeric(12,2) not null default 0 check (change_due >= 0);

update public.service_note_payments
set amount_received = amount_paid
where amount_received = 0 and amount_paid > 0;
