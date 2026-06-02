"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdminContext } from "@/services/context";
import type {
  BillingCycle,
  BillingEventType,
  BillingPlan,
  Tenant,
  TenantSubscription,
  TenantSubscriptionStatus,
} from "@/types/database";

type AdminTenant = Tenant & {
  users?: { id: string; email: string; full_name: string | null; role: string; created_at: string }[];
  tenant_subscriptions?: (TenantSubscription & { billing_plans?: BillingPlan | null })[];
};

type AdminBillingEvent = {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  platform_user_id: string | null;
  type: BillingEventType;
  amount: number;
  currency: string;
  occurred_at: string;
  note: string | null;
  created_at: string;
  tenants?: Pick<Tenant, "id" | "name" | "slug"> | null;
  platform_users?: { email: string } | null;
};

export async function getAdminDashboardData() {
  const { service } = await requirePlatformAdminContext();

  const [tenantsResult, plansResult, eventsResult] = await Promise.all([
    service
      .from("tenants")
      .select(`
        id, tenant_id, name, slug, email, phone, operational_status, primary_contact_name, primary_contact_email, created_at, updated_at,
        users(id, email, full_name, role, created_at),
        tenant_subscriptions(
          id, tenant_id, plan_id, billing_cycle, status, started_at, current_period_end, canceled_at, notes, created_at, updated_at,
          billing_plans(id, name, description, currency, monthly_price, yearly_price, active, display_order, created_at, updated_at)
        )
      `)
      .order("created_at", { ascending: false }),
    service
      .from("billing_plans")
      .select("id, name, description, currency, monthly_price, yearly_price, active, display_order, created_at, updated_at")
      .order("display_order", { ascending: true }),
    service
      .from("billing_events")
      .select("id, tenant_id, subscription_id, platform_user_id, type, amount, currency, occurred_at, note, created_at, tenants(id, name, slug), platform_users(email)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (tenantsResult.error) throw new Error(tenantsResult.error.message);
  if (plansResult.error) throw new Error(plansResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const companies = normalizeAdminTenants(tenantsResult.data ?? []);
  const plans = (plansResult.data ?? []) as BillingPlan[];
  const events = normalizeAdminBillingEvents(eventsResult.data ?? []);
  const subscriptions = companies.map((tenant) => tenant.tenant_subscriptions?.[0]).filter(Boolean) as (TenantSubscription & { billing_plans?: BillingPlan | null })[];
  const billableSubscriptions = subscriptions.filter((subscription) => subscription.status === "active" || subscription.status === "trialing");
  const mrr = billableSubscriptions.reduce((total, subscription) => total + monthlyValue(subscription), 0);
  const arr = mrr * 12;

  return {
    companies: companies.slice(0, 8),
    plans,
    events,
    byPlan: plans.map((plan) => ({
      plan,
      count: subscriptions.filter((subscription) => subscription.plan_id === plan.id).length,
      mrr: subscriptions.filter((subscription) => subscription.plan_id === plan.id).reduce((total, subscription) => total + monthlyValue(subscription), 0),
    })),
    stats: {
      mrr,
      arr,
      companies: companies.length,
      activeCompanies: companies.filter((company) => company.operational_status === "active").length,
      suspendedCompanies: companies.filter((company) => company.operational_status === "suspended").length,
      trialing: subscriptions.filter((subscription) => subscription.status === "trialing").length,
      pastDue: subscriptions.filter((subscription) => subscription.status === "past_due").length,
      yearlyExpected: billableSubscriptions.reduce((total, subscription) => total + yearlyValue(subscription), 0),
    },
  };
}

export async function getAdminCompaniesData() {
  const { service } = await requirePlatformAdminContext();
  const { data, error } = await service
    .from("tenants")
    .select(`
      id, tenant_id, name, slug, email, phone, city, state, operational_status, primary_contact_name, primary_contact_email, internal_notes, created_at, updated_at,
      users(id, email, full_name, role, created_at),
      tenant_subscriptions(
        id, tenant_id, plan_id, billing_cycle, status, started_at, current_period_end, canceled_at, notes, created_at, updated_at,
        billing_plans(id, name, description, currency, monthly_price, yearly_price, active, display_order, created_at, updated_at)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return normalizeAdminTenants(data ?? []);
}

export async function getAdminCompanyData(companyId: string) {
  const { service } = await requirePlatformAdminContext();
  const [companyResult, plansResult, eventsResult] = await Promise.all([
    service
      .from("tenants")
      .select(`
        id, tenant_id, name, slug, legal_name, tax_id, phone, email, address, postal_code, city, state, country, image_url, image_path,
        operational_status, primary_contact_name, primary_contact_email, internal_notes, created_at, updated_at,
        users(id, email, full_name, role, created_at),
        tenant_subscriptions(
          id, tenant_id, plan_id, billing_cycle, status, started_at, current_period_end, canceled_at, notes, created_at, updated_at,
          billing_plans(id, name, description, currency, monthly_price, yearly_price, active, display_order, created_at, updated_at)
        )
      `)
      .eq("id", companyId)
      .single(),
    service
      .from("billing_plans")
      .select("id, name, description, currency, monthly_price, yearly_price, active, display_order, created_at, updated_at")
      .order("display_order", { ascending: true }),
    service
      .from("billing_events")
      .select("id, tenant_id, subscription_id, platform_user_id, type, amount, currency, occurred_at, note, created_at, tenants(id, name, slug), platform_users(email)")
      .eq("tenant_id", companyId)
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);

  if (companyResult.error) throw new Error(companyResult.error.message);
  if (plansResult.error) throw new Error(plansResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  return {
    company: normalizeAdminTenants([companyResult.data])[0],
    plans: (plansResult.data ?? []) as BillingPlan[],
    events: normalizeAdminBillingEvents(eventsResult.data ?? []),
  };
}

export async function getAdminPlansData() {
  const { service } = await requirePlatformAdminContext();
  const [plansResult, subscriptionsResult] = await Promise.all([
    service
      .from("billing_plans")
      .select("id, name, description, currency, monthly_price, yearly_price, active, display_order, created_at, updated_at")
      .order("display_order", { ascending: true }),
    service
      .from("tenant_subscriptions")
      .select("id, plan_id, status, billing_cycle"),
  ]);

  if (plansResult.error) throw new Error(plansResult.error.message);
  if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);

  const subscriptions = (subscriptionsResult.data ?? []) as Pick<TenantSubscription, "id" | "plan_id" | "status" | "billing_cycle">[];

  return ((plansResult.data ?? []) as BillingPlan[]).map((plan) => ({
    ...plan,
    subscription_count: subscriptions.filter((subscription) => subscription.plan_id === plan.id).length,
    active_subscription_count: subscriptions.filter((subscription) => subscription.plan_id === plan.id && subscription.status === "active").length,
  }));
}

export async function getAdminBillingData() {
  const { service } = await requirePlatformAdminContext();
  const [eventsResult, tenantsResult, plansResult] = await Promise.all([
    service
      .from("billing_events")
      .select("id, tenant_id, subscription_id, platform_user_id, type, amount, currency, occurred_at, note, created_at, tenants(id, name, slug), platform_users(email)")
      .order("occurred_at", { ascending: false })
      .limit(100),
    service
      .from("tenants")
      .select("id, name, slug, tenant_subscriptions(id, status, plan_id, billing_cycle, billing_plans(id, name, monthly_price, yearly_price, currency))")
      .order("name", { ascending: true }),
    service
      .from("billing_plans")
      .select("id, name, description, currency, monthly_price, yearly_price, active, display_order, created_at, updated_at")
      .order("display_order", { ascending: true }),
  ]);

  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (tenantsResult.error) throw new Error(tenantsResult.error.message);
  if (plansResult.error) throw new Error(plansResult.error.message);

  const events = normalizeAdminBillingEvents(eventsResult.data ?? []);

  return {
    events,
    tenants: normalizeAdminTenants(tenantsResult.data ?? []),
    plans: (plansResult.data ?? []) as BillingPlan[],
    totals: {
      payments: events.filter((event) => event.type === "payment").reduce((total, event) => total + Number(event.amount ?? 0), 0),
      adjustments: events.filter((event) => event.type === "adjustment").reduce((total, event) => total + Number(event.amount ?? 0), 0),
      count: events.length,
    },
  };
}

export async function getAdminUsersData() {
  const { service } = await requirePlatformAdminContext();
  const [usersResult, tenantsResult] = await Promise.all([
    service
      .from("users")
      .select("id, tenant_id, email, full_name, role, created_at, tenants(id, name, slug)")
      .order("created_at", { ascending: false }),
    service
      .from("tenants")
      .select("id, name, slug")
      .order("name", { ascending: true }),
  ]);

  if (usersResult.error) throw new Error(usersResult.error.message);
  if (tenantsResult.error) throw new Error(tenantsResult.error.message);

  return {
    users: usersResult.data ?? [],
    tenants: tenantsResult.data ?? [],
  };
}

export async function createCompanyAction(formData: FormData) {
  const { service } = await requirePlatformAdminContext();
  const name = requiredString(formData, "name");
  const slug = slugify(String(formData.get("slug") || name));
  const planId = optionalString(formData, "plan_id");
  const ownerEmail = optionalString(formData, "owner_email")?.toLowerCase();
  const ownerName = optionalString(formData, "owner_name");

  const { data: tenant, error } = await service
    .from("tenants")
    .insert({
      name,
      slug,
      email: optionalString(formData, "email") ?? ownerEmail ?? null,
      phone: optionalString(formData, "phone") ?? null,
      operational_status: formData.get("operational_status") === "suspended" ? "suspended" : "active",
      primary_contact_name: ownerName ?? null,
      primary_contact_email: ownerEmail ?? null,
      internal_notes: optionalString(formData, "internal_notes") ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (planId) {
    await upsertSubscription(service, tenant.id, {
      plan_id: planId,
      billing_cycle: billingCycle(formData),
      status: subscriptionStatus(formData),
      current_period_end: optionalString(formData, "current_period_end") ?? null,
      notes: optionalString(formData, "subscription_notes") ?? null,
    });
  }

  if (ownerEmail) {
    await inviteUser(service, tenant.id, ownerEmail, ownerName, "admin");
  }

  revalidateAdmin();
  redirect(`/admin/companies/${tenant.id}`);
}

export async function updateCompanyAction(formData: FormData) {
  const { service } = await requirePlatformAdminContext();
  const companyId = requiredString(formData, "company_id");

  const { error } = await service
    .from("tenants")
    .update({
      name: requiredString(formData, "name"),
      slug: slugify(requiredString(formData, "slug")),
      email: optionalString(formData, "email") ?? null,
      phone: optionalString(formData, "phone") ?? null,
      operational_status: formData.get("operational_status") === "suspended" ? "suspended" : "active",
      primary_contact_name: optionalString(formData, "primary_contact_name") ?? null,
      primary_contact_email: optionalString(formData, "primary_contact_email") ?? null,
      internal_notes: optionalString(formData, "internal_notes") ?? null,
    })
    .eq("id", companyId);

  if (error) throw new Error(error.message);

  revalidateAdmin(companyId);
}

export async function updateSubscriptionAction(formData: FormData) {
  const { service } = await requirePlatformAdminContext();
  const companyId = requiredString(formData, "company_id");

  await upsertSubscription(service, companyId, {
    plan_id: optionalString(formData, "plan_id") ?? null,
    billing_cycle: billingCycle(formData),
    status: subscriptionStatus(formData),
    current_period_end: optionalString(formData, "current_period_end") ?? null,
    notes: optionalString(formData, "subscription_notes") ?? null,
  });

  revalidateAdmin(companyId);
}

export async function inviteCompanyUserAction(formData: FormData) {
  const { service } = await requirePlatformAdminContext();
  const companyId = requiredString(formData, "company_id");
  const email = requiredString(formData, "email").toLowerCase();
  const fullName = optionalString(formData, "full_name");
  const role = optionalString(formData, "role") ?? "operator";

  await inviteUser(service, companyId, email, fullName, role);
  revalidateAdmin(companyId);
}

export async function createPlanAction(formData: FormData) {
  const { service } = await requirePlatformAdminContext();
  const { error } = await service.from("billing_plans").insert(planPayload(formData));

  if (error) throw new Error(error.message);

  revalidatePath("/admin/plans");
  revalidatePath("/admin");
}

export async function updatePlanAction(formData: FormData) {
  const { service } = await requirePlatformAdminContext();
  const planId = requiredString(formData, "plan_id");
  const { error } = await service.from("billing_plans").update(planPayload(formData)).eq("id", planId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/plans");
  revalidatePath("/admin");
}

export async function recordBillingEventAction(formData: FormData) {
  const { service, platformUser } = await requirePlatformAdminContext();
  const tenantId = requiredString(formData, "tenant_id");
  const subscriptionId = optionalString(formData, "subscription_id");
  const type = billingEventType(formData);

  const { error } = await service.from("billing_events").insert({
    tenant_id: tenantId,
    subscription_id: subscriptionId ?? null,
    platform_user_id: platformUser.id,
    type,
    amount: moneyValue(formData, "amount"),
    currency: optionalString(formData, "currency") ?? "MXN",
    occurred_at: optionalString(formData, "occurred_at") ?? new Date().toISOString().slice(0, 10),
    note: optionalString(formData, "note") ?? null,
  });

  if (error) throw new Error(error.message);

  revalidateAdmin(tenantId);
}

async function upsertSubscription(
  service: ReturnType<typeof import("@/lib/supabase/service-role").createSupabaseServiceRoleClient>,
  tenantId: string,
  payload: {
    plan_id: string | null;
    billing_cycle: BillingCycle;
    status: TenantSubscriptionStatus;
    current_period_end: string | null;
    notes: string | null;
  },
) {
  const { error } = await service
    .from("tenant_subscriptions")
    .upsert(
      {
        tenant_id: tenantId,
        ...payload,
        canceled_at: payload.status === "canceled" ? new Date().toISOString() : null,
      },
      { onConflict: "tenant_id" },
    );

  if (error) throw new Error(error.message);
}

async function inviteUser(
  service: ReturnType<typeof import("@/lib/supabase/service-role").createSupabaseServiceRoleClient>,
  tenantId: string,
  email: string,
  fullName: string | null | undefined,
  role: string,
) {
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName ?? "",
      tenant_id: tenantId,
      role,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("No se pudo crear invitacion de usuario.");

  const { error: profileError } = await service.from("users").upsert(
    {
      id: data.user.id,
      tenant_id: tenantId,
      email,
      full_name: fullName ?? null,
      role,
    },
    { onConflict: "id" },
  );

  if (profileError) throw new Error(profileError.message);
}

function normalizeAdminTenants(data: unknown[]) {
  return data.map((tenant) => {
    const value = tenant as AdminTenant;
    return {
      ...value,
      users: value.users ?? [],
      tenant_subscriptions: value.tenant_subscriptions ?? [],
    };
  });
}

function normalizeAdminBillingEvents(data: unknown[]) {
  return data.map((event) => {
    const value = event as AdminBillingEvent & {
      tenants?: Pick<Tenant, "id" | "name" | "slug"> | Pick<Tenant, "id" | "name" | "slug">[] | null;
      platform_users?: { email: string } | { email: string }[] | null;
    };

    return {
      ...value,
      tenants: Array.isArray(value.tenants) ? value.tenants[0] ?? null : value.tenants ?? null,
      platform_users: Array.isArray(value.platform_users) ? value.platform_users[0] ?? null : value.platform_users ?? null,
    } satisfies AdminBillingEvent;
  });
}

function monthlyValue(subscription: TenantSubscription & { billing_plans?: BillingPlan | null }) {
  const plan = subscription.billing_plans;
  if (!plan) return 0;
  return subscription.billing_cycle === "yearly" ? Number(plan.yearly_price ?? 0) / 12 : Number(plan.monthly_price ?? 0);
}

function yearlyValue(subscription: TenantSubscription & { billing_plans?: BillingPlan | null }) {
  const plan = subscription.billing_plans;
  if (!plan) return 0;
  return subscription.billing_cycle === "yearly" ? Number(plan.yearly_price ?? 0) : Number(plan.monthly_price ?? 0) * 12;
}

function planPayload(formData: FormData) {
  return {
    name: requiredString(formData, "name"),
    description: optionalString(formData, "description") ?? null,
    currency: optionalString(formData, "currency") ?? "MXN",
    monthly_price: moneyValue(formData, "monthly_price"),
    yearly_price: moneyValue(formData, "yearly_price"),
    active: formData.get("active") === "on",
    display_order: Number(formData.get("display_order") || 0),
  };
}

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`Falta ${key}.`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function moneyValue(formData: FormData, key: string) {
  const value = Number(formData.get(key) || 0);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Monto invalido: ${key}.`);
  return value;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function billingCycle(formData: FormData): BillingCycle {
  return formData.get("billing_cycle") === "yearly" ? "yearly" : "monthly";
}

function subscriptionStatus(formData: FormData): TenantSubscriptionStatus {
  const status = String(formData.get("status") ?? "trialing");
  if (status === "active" || status === "past_due" || status === "canceled") return status;
  return "trialing";
}

function billingEventType(formData: FormData): BillingEventType {
  const type = String(formData.get("type") ?? "payment");
  if (type === "adjustment" || type === "cancellation" || type === "note") return type;
  return "payment";
}

function revalidateAdmin(companyId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/users");
  revalidatePath("/admin/billing");
  if (companyId) revalidatePath(`/admin/companies/${companyId}`);
}
