import Link from "next/link";
import { ArrowRight, Banknote, Building2, CalendarClock, CreditCard, TrendingUp, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, money } from "@/lib/utils";
import { getAdminDashboardData } from "@/services/admin";
import { requirePlatformAdminContext } from "@/services/context";

export default async function AdminDashboardPage() {
  const [{ platformUser }, data] = await Promise.all([requirePlatformAdminContext(), getAdminDashboardData()]);
  const maxPlanMrr = Math.max(...data.byPlan.map((item) => item.mrr), 1);

  return (
    <AdminShell email={platformUser.email}>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard plataforma</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Estado comercial de Pulso: planes, companias, pagos manuales y riesgo de cobranza.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/companies">
                <Building2 className="h-4 w-4" />
                Ver companias
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/billing">
                <Banknote className="h-4 w-4" />
                Registrar pago
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={TrendingUp} label="MRR" value={money(data.stats.mrr)} detail="Ingreso mensual esperado" />
          <MetricCard icon={CreditCard} label="ARR" value={money(data.stats.arr)} detail="MRR proyectado a 12 meses" />
          <MetricCard icon={Building2} label="Companias" value={data.stats.companies} detail={`${data.stats.activeCompanies} activas, ${data.stats.suspendedCompanies} suspendidas`} />
          <MetricCard icon={CalendarClock} label="Riesgo" value={data.stats.pastDue} detail={`${data.stats.trialing} en trial, ${data.stats.pastDue} vencidas`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Facturacion por plan</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">MRR esperado por suscripciones activas o trial.</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/plans">Editar planes</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.byPlan.map((item) => (
                <div key={item.plan.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{item.plan.name}</p>
                      <p className="text-xs text-muted-foreground">{item.count} companias</p>
                    </div>
                    <p className="font-semibold">{money(item.mrr)}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((item.mrr / maxPlanMrr) * 100, item.mrr > 0 ? 8 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ultimos eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.events.length === 0 ? (
                <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">Sin eventos de facturacion todavia.</p>
              ) : (
                data.events.map((event) => (
                  <div key={event.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{event.tenants?.name ?? "Compania"}</p>
                      <Badge variant={event.type === "payment" ? "success" : event.type === "cancellation" ? "destructive" : "secondary"}>{event.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{money(Number(event.amount ?? 0))} · {formatDate(event.occurred_at)}</p>
                    {event.note ? <p className="mt-2 text-sm">{event.note}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Companias recientes</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Acceso rapido a suscripcion, usuarios y notas internas.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/companies">
                Abrir tabla
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border/70 bg-secondary/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Compania</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Usuarios</th>
                  <th className="px-5 py-3 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((company) => {
                  const subscription = company.tenant_subscriptions?.[0];
                  return (
                    <tr key={company.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3">
                        <Link className="font-medium text-primary hover:underline" href={`/admin/companies/${company.id}`}>{company.name}</Link>
                        <p className="text-xs text-muted-foreground">{company.slug}</p>
                      </td>
                      <td className="px-5 py-3">{subscription?.billing_plans?.name ?? "Sin plan"}</td>
                      <td className="px-5 py-3"><StatusBadge status={subscription?.status ?? company.operational_status} /></td>
                      <td className="px-5 py-3">{company.users?.length ?? 0}</td>
                      <td className="px-5 py-3">{formatDate(company.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function MetricCard({ detail, icon: Icon, label, value }: { detail: string; icon: typeof UsersRound; label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "success" : status === "past_due" || status === "suspended" ? "warning" : status === "canceled" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
