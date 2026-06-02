create type tenant_operational_status as enum ('active', 'suspended');
create type billing_cycle as enum ('monthly', 'yearly');
create type tenant_subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type billing_event_type as enum ('payment', 'adjustment', 'cancellation', 'note');

alter table public.tenants
add column if not exists operational_status tenant_operational_status not null default 'active',
add column if not exists primary_contact_name text,
add column if not exists primary_contact_email text,
add column if not exists internal_notes text;

create table public.platform_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'superadmin' check (role in ('superadmin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  currency text not null default 'MXN',
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  yearly_price numeric(12,2) not null default 0 check (yearly_price >= 0),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid references public.billing_plans(id) on delete set null,
  billing_cycle billing_cycle not null default 'monthly',
  status tenant_subscription_status not null default 'trialing',
  started_at date not null default current_date,
  current_period_end date,
  canceled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid references public.tenant_subscriptions(id) on delete set null,
  platform_user_id uuid references public.platform_users(id) on delete set null,
  type billing_event_type not null default 'payment',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'MXN',
  occurred_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create trigger platform_users_updated_at before update on public.platform_users for each row execute function public.set_updated_at();
create trigger billing_plans_updated_at before update on public.billing_plans for each row execute function public.set_updated_at();
create trigger tenant_subscriptions_updated_at before update on public.tenant_subscriptions for each row execute function public.set_updated_at();

alter table public.platform_users enable row level security;
alter table public.billing_plans enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.billing_events enable row level security;

create index platform_users_email_idx on public.platform_users (lower(email));
create index billing_plans_active_order_idx on public.billing_plans (active, display_order);
create index tenant_subscriptions_tenant_idx on public.tenant_subscriptions (tenant_id);
create index tenant_subscriptions_plan_idx on public.tenant_subscriptions (plan_id);
create index tenant_subscriptions_status_idx on public.tenant_subscriptions (status);
create index billing_events_tenant_occurred_idx on public.billing_events (tenant_id, occurred_at desc);
create index billing_events_subscription_idx on public.billing_events (subscription_id);
create index billing_events_type_idx on public.billing_events (type);
create index tenants_operational_status_idx on public.tenants (operational_status);

insert into public.billing_plans (name, description, monthly_price, yearly_price, active, display_order)
values
  ('Basico', 'Inventario, ventas, compras y reportes basicos.', 349, 3490, true, 10),
  ('Premium', 'Reportes avanzados, control de usuarios y alertas.', 699, 6990, true, 20),
  ('Empresa', 'Sucursales y soporte avanzado con precio personalizado.', 0, 0, true, 30)
on conflict (name) do update
set
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  yearly_price = excluded.yearly_price,
  active = excluded.active,
  display_order = excluded.display_order,
  updated_at = now();

-- Seed your first superadmin after the matching Auth user exists:
-- insert into public.platform_users (email) values ('tu-correo@dominio.com') on conflict (email) do nothing;
