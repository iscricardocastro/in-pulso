import Link from "next/link";
import { ArrowLeft, Banknote, Building2, Save, UserPlus } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, money } from "@/lib/utils";
import {
  inviteCompanyUserAction,
  recordBillingEventAction,
  getAdminCompanyData,
  updateCompanyAction,
  updateSubscriptionAction,
} from "@/services/admin";
import { requirePlatformAdminContext } from "@/services/context";

type CompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCompanyDetailPage({ params }: CompanyPageProps) {
  const { id } = await params;
  const [{ platformUser }, data] = await Promise.all([requirePlatformAdminContext(), getAdminCompanyData(id)]);
  const { company, plans, events } = data;
  const subscription = company.tenant_subscriptions?.[0];
  const plan = subscription?.billing_plans;
  const mrr = plan ? subscription.billing_cycle === "yearly" ? Number(plan.yearly_price) / 12 : Number(plan.monthly_price) : 0;

  return (
    <AdminShell email={platformUser.email}>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Button asChild className="mb-3" size="sm" variant="ghost">
              <Link href="/admin/companies">
                <ArrowLeft className="h-4 w-4" />
                Companias
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
              <StatusBadge status={company.operational_status} />
              {subscription ? <StatusBadge status={subscription.status} /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{company.slug} · Alta {formatDate(company.created_at)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-semibold">{plan?.name ?? "Sin plan"}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="font-semibold">{money(mrr)}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Datos compania
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateCompanyAction} className="grid gap-4 md:grid-cols-2">
                <input name="company_id" type="hidden" value={company.id} />
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" defaultValue={company.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" name="slug" defaultValue={company.slug} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email compania</Label>
                  <Input id="email" name="email" defaultValue={company.email ?? ""} type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input id="phone" name="phone" defaultValue={company.phone ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_name">Contacto</Label>
                  <Input id="primary_contact_name" name="primary_contact_name" defaultValue={company.primary_contact_name ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_email">Email contacto</Label>
                  <Input id="primary_contact_email" name="primary_contact_email" defaultValue={company.primary_contact_email ?? ""} type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operational_status">Estado operativo</Label>
                  <Select id="operational_status" name="operational_status" defaultValue={company.operational_status}>
                    <option value="active">Activa</option>
                    <option value="suspended">Suspendida</option>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="internal_notes">Notas internas</Label>
                  <Textarea id="internal_notes" name="internal_notes" defaultValue={company.internal_notes ?? ""} rows={3} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suscripcion</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateSubscriptionAction} className="space-y-4">
                <input name="company_id" type="hidden" value={company.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plan_id">Plan</Label>
                    <Select id="plan_id" name="plan_id" defaultValue={subscription?.plan_id ?? ""}>
                      <option value="">Sin plan</option>
                      {plans.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_cycle">Ciclo</Label>
                    <Select id="billing_cycle" name="billing_cycle" defaultValue={subscription?.billing_cycle ?? "monthly"}>
                      <option value="monthly">Mensual</option>
                      <option value="yearly">Anual</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select id="status" name="status" defaultValue={subscription?.status ?? "trialing"}>
                      <option value="trialing">Trial</option>
                      <option value="active">Activa</option>
                      <option value="past_due">Vencida</option>
                      <option value="canceled">Cancelada</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_period_end">Periodo termina</Label>
                    <Input id="current_period_end" name="current_period_end" defaultValue={subscription?.current_period_end ?? ""} type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription_notes">Notas suscripcion</Label>
                  <Textarea id="subscription_notes" name="subscription_notes" defaultValue={subscription?.notes ?? ""} rows={3} />
                </div>
                <Button type="submit">
                  <Save className="h-4 w-4" />
                  Guardar suscripcion
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invitar usuario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={inviteCompanyUserAction} className="space-y-4">
                <input name="company_id" type="hidden" value={company.id} />
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input id="user-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre</Label>
                  <Input id="full_name" name="full_name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select id="role" name="role" defaultValue="operator">
                    <option value="operator">Operador</option>
                    <option value="admin">Admin compania</option>
                  </Select>
                </div>
                <Button type="submit">
                  <UserPlus className="h-4 w-4" />
                  Enviar invitacion
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-y border-border/70 bg-secondary/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Usuario</th>
                    <th className="px-5 py-3 font-medium">Rol</th>
                    <th className="px-5 py-3 font-medium">Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {(company.users ?? []).map((user) => (
                    <tr key={user.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium">{user.full_name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-5 py-3"><Badge variant="secondary">{user.role}</Badge></td>
                      <td className="px-5 py-3">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Facturacion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={recordBillingEventAction} className="mb-5 grid gap-4 md:grid-cols-5">
              <input name="tenant_id" type="hidden" value={company.id} />
              <input name="subscription_id" type="hidden" value={subscription?.id ?? ""} />
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select id="type" name="type">
                  <option value="payment">Pago</option>
                  <option value="adjustment">Ajuste</option>
                  <option value="cancellation">Cancelacion</option>
                  <option value="note">Nota</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" name="amount" min="0" step="0.01" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occurred_at">Fecha</Label>
                <Input id="occurred_at" name="occurred_at" type="date" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="note">Nota</Label>
                <Input id="note" name="note" placeholder="Referencia, ajuste o comentario" />
              </div>
              <div className="md:col-span-5">
                <Button type="submit">Registrar evento</Button>
              </div>
            </form>
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-t border-border/60">
                      <td className="px-4 py-3">{formatDate(event.occurred_at)}</td>
                      <td className="px-4 py-3"><Badge variant={event.type === "payment" ? "success" : "secondary"}>{event.type}</Badge></td>
                      <td className="px-4 py-3">{money(Number(event.amount ?? 0))}</td>
                      <td className="px-4 py-3">{event.note ?? "Sin nota"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "success" : status === "past_due" || status === "suspended" ? "warning" : status === "canceled" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
