import Link from "next/link";
import { Banknote, Download, Search } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatDate, money } from "@/lib/utils";
import { getAdminBillingData, recordBillingEventAction } from "@/services/admin";
import { requirePlatformAdminContext } from "@/services/context";

type BillingPageProps = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

export default async function AdminBillingPage({ searchParams }: BillingPageProps) {
  const [{ platformUser }, data, params] = await Promise.all([requirePlatformAdminContext(), getAdminBillingData(), searchParams]);
  const query = (params.q ?? "").toLowerCase();
  const type = params.type ?? "all";
  const filtered = data.events.filter((event) => {
    const haystack = [event.tenants?.name, event.tenants?.slug, event.note, event.type].filter(Boolean).join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (type === "all" || event.type === type);
  });

  return (
    <AdminShell email={platformUser.email}>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Facturacion</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Registra pagos manuales, ajustes y notas para mantener visible lo facturado.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/billing/export">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Link>
          </Button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Pagos" value={money(data.totals.payments)} />
          <Metric label="Ajustes" value={money(data.totals.adjustments)} />
          <Metric label="Eventos" value={data.totals.count} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Registrar evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={recordBillingEventAction} className="grid gap-4 lg:grid-cols-6">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="tenant_id">Compania</Label>
                <Select id="tenant_id" name="tenant_id" required>
                  <option value="">Seleccionar</option>
                  {data.tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </Select>
              </div>
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
                <Input id="amount" min="0" name="amount" step="0.01" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occurred_at">Fecha</Label>
                <Input id="occurred_at" name="occurred_at" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input id="currency" name="currency" defaultValue="MXN" />
              </div>
              <div className="space-y-2 lg:col-span-5">
                <Label htmlFor="note">Nota</Label>
                <Input id="note" name="note" placeholder="Referencia, folio o comentario" />
              </div>
              <div className="flex items-end">
                <Button className="w-full" type="submit">Registrar</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <form className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Eventos recientes</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{filtered.length} registros en vista.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9 sm:w-72" name="q" placeholder="Buscar evento" defaultValue={params.q ?? ""} />
                </div>
                <Select className="sm:w-44" name="type" defaultValue={type}>
                  <option value="all">Todos</option>
                  <option value="payment">Pagos</option>
                  <option value="adjustment">Ajustes</option>
                  <option value="cancellation">Cancelaciones</option>
                  <option value="note">Notas</option>
                </Select>
                <Button type="submit" variant="outline">Filtrar</Button>
              </div>
            </form>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border/70 bg-secondary/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Compania</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Nota</th>
                  <th className="px-5 py-3 font-medium">Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr key={event.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">{formatDate(event.occurred_at)}</td>
                    <td className="px-5 py-3">
                      {event.tenants ? (
                        <Link className="font-medium text-primary hover:underline" href={`/admin/companies/${event.tenants.id}`}>{event.tenants.name}</Link>
                      ) : (
                        "Compania"
                      )}
                    </td>
                    <td className="px-5 py-3"><EventBadge type={event.type} /></td>
                    <td className="px-5 py-3">{money(Number(event.amount ?? 0))}</td>
                    <td className="max-w-md px-5 py-3 text-muted-foreground">{event.note ?? "Sin nota"}</td>
                    <td className="px-5 py-3">{event.platform_users?.email ?? "Admin"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{label}</p>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EventBadge({ type }: { type: string }) {
  const variant = type === "payment" ? "success" : type === "cancellation" ? "destructive" : type === "adjustment" ? "warning" : "secondary";
  return <Badge variant={variant}>{type}</Badge>;
}
