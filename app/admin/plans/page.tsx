import { Plus, Save, Settings2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/utils";
import { createPlanAction, getAdminPlansData, updatePlanAction } from "@/services/admin";
import { requirePlatformAdminContext } from "@/services/context";

export default async function AdminPlansPage() {
  const [{ platformUser }, plans] = await Promise.all([requirePlatformAdminContext(), getAdminPlansData()]);

  return (
    <AdminShell email={platformUser.email}>
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configura precios mensual/anual y controla que planes aparecen activos para nuevas suscripciones.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPlanAction} className="grid gap-4 lg:grid-cols-6">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="new-name">Nombre</Label>
                <Input id="new-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-monthly">Mensual</Label>
                <Input id="new-monthly" min="0" name="monthly_price" step="0.01" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-yearly">Anual</Label>
                <Input id="new-yearly" min="0" name="yearly_price" step="0.01" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-order">Orden</Label>
                <Input id="new-order" name="display_order" type="number" defaultValue="40" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-border/80 px-3 text-sm">
                  <input defaultChecked name="active" type="checkbox" />
                  Activo
                </label>
              </div>
              <div className="space-y-2 lg:col-span-5">
                <Label htmlFor="new-description">Descripcion</Label>
                <Textarea id="new-description" name="description" rows={2} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" type="submit">Crear plan</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    {plan.name}
                    <Badge variant={plan.active ? "success" : "secondary"}>{plan.active ? "Activo" : "Inactivo"}</Badge>
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.subscription_count} companias, {plan.active_subscription_count} activas
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{money(Number(plan.monthly_price))} / mes</p>
                  <p className="text-muted-foreground">{money(Number(plan.yearly_price))} / ano</p>
                </div>
              </CardHeader>
              <CardContent>
                <form action={updatePlanAction} className="grid gap-4 lg:grid-cols-6">
                  <input name="plan_id" type="hidden" value={plan.id} />
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor={`name-${plan.id}`}>Nombre</Label>
                    <Input id={`name-${plan.id}`} name="name" defaultValue={plan.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`monthly-${plan.id}`}>Mensual</Label>
                    <Input id={`monthly-${plan.id}`} min="0" name="monthly_price" step="0.01" type="number" defaultValue={plan.monthly_price} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`yearly-${plan.id}`}>Anual</Label>
                    <Input id={`yearly-${plan.id}`} min="0" name="yearly_price" step="0.01" type="number" defaultValue={plan.yearly_price} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`order-${plan.id}`}>Orden</Label>
                    <Input id={`order-${plan.id}`} name="display_order" type="number" defaultValue={plan.display_order} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex h-10 items-center gap-2 rounded-lg border border-border/80 px-3 text-sm">
                      <input defaultChecked={plan.active} name="active" type="checkbox" />
                      Activo
                    </label>
                  </div>
                  <div className="space-y-2 lg:col-span-5">
                    <Label htmlFor={`description-${plan.id}`}>Descripcion</Label>
                    <Textarea id={`description-${plan.id}`} name="description" defaultValue={plan.description ?? ""} rows={2} />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" type="submit" variant="outline">
                      <Save className="h-4 w-4" />
                      Guardar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
