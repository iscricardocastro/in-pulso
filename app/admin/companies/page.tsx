import Link from "next/link";
import { Plus, Search, UserPlus } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, money } from "@/lib/utils";
import { createCompanyAction, getAdminCompaniesData, getAdminPlansData } from "@/services/admin";
import { requirePlatformAdminContext } from "@/services/context";

type CompaniesPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminCompaniesPage({ searchParams }: CompaniesPageProps) {
  const [{ platformUser }, companies, plans, params] = await Promise.all([
    requirePlatformAdminContext(),
    getAdminCompaniesData(),
    getAdminPlansData(),
    searchParams,
  ]);
  const query = (params.q ?? "").toLowerCase();
  const status = params.status ?? "all";
  const filtered = companies.filter((company) => {
    const subscription = company.tenant_subscriptions?.[0];
    const haystack = [company.name, company.slug, company.email, company.primary_contact_email, subscription?.billing_plans?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = status === "all" || company.operational_status === status || subscription?.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <AdminShell email={platformUser.email}>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Companias</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Alta de clientes, usuarios invitados, estado operativo y suscripcion asignada.
            </p>
          </div>
          <Badge className="rounded-lg px-3 py-2" variant="secondary">{filtered.length} resultados</Badge>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear compania
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCompanyAction} className="grid gap-4 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nombre</Label>
                <Input id="company-name" name="name" placeholder="Pulso Demo" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-slug">Slug</Label>
                <Input id="company-slug" name="slug" placeholder="pulso-demo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-plan">Plan</Label>
                <Select id="company-plan" name="plan_id">
                  <option value="">Sin plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-cycle">Ciclo</Label>
                <Select id="company-cycle" name="billing_cycle">
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-owner">Admin inicial</Label>
                <Input id="company-owner" name="owner_email" placeholder="correo@cliente.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-owner-name">Nombre admin</Label>
                <Input id="company-owner-name" name="owner_name" placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Telefono</Label>
                <Input id="company-phone" name="phone" placeholder="452 000 0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-status">Suscripcion</Label>
                <Select id="company-status" name="status">
                  <option value="trialing">Trial</option>
                  <option value="active">Activa</option>
                  <option value="past_due">Vencida</option>
                  <option value="canceled">Cancelada</option>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="company-notes">Notas internas</Label>
                <Textarea id="company-notes" name="internal_notes" placeholder="Contexto comercial o soporte" rows={2} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" type="submit">
                  <UserPlus className="h-4 w-4" />
                  Crear e invitar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <form className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Directorio</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Busca por nombre, slug, correo o plan.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9 sm:w-72" name="q" placeholder="Buscar compania" defaultValue={params.q ?? ""} />
                </div>
                <Select className="sm:w-44" name="status" defaultValue={status}>
                  <option value="all">Todos</option>
                  <option value="active">Activas</option>
                  <option value="suspended">Suspendidas</option>
                  <option value="trialing">Trial</option>
                  <option value="past_due">Vencidas</option>
                  <option value="canceled">Canceladas</option>
                </Select>
                <Button type="submit" variant="outline">Filtrar</Button>
              </div>
            </form>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border/70 bg-secondary/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Compania</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Usuarios</th>
                  <th className="px-5 py-3 font-medium">MRR</th>
                  <th className="px-5 py-3 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => {
                  const subscription = company.tenant_subscriptions?.[0];
                  const plan = subscription?.billing_plans;
                  const mrr = plan ? subscription.billing_cycle === "yearly" ? Number(plan.yearly_price) / 12 : Number(plan.monthly_price) : 0;

                  return (
                    <tr key={company.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3">
                        <Link className="font-medium text-primary hover:underline" href={`/admin/companies/${company.id}`}>{company.name}</Link>
                        <p className="text-xs text-muted-foreground">{company.slug}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p>{plan?.name ?? "Sin plan"}</p>
                        {subscription ? <p className="text-xs text-muted-foreground">{subscription.billing_cycle === "yearly" ? "Anual" : "Mensual"}</p> : null}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={subscription?.status ?? company.operational_status} /></td>
                      <td className="px-5 py-3">{company.users?.length ?? 0}</td>
                      <td className="px-5 py-3">{money(mrr)}</td>
                      <td className="px-5 py-3">{formatDate(company.created_at)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={6}>
                      Sin companias para este filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
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
