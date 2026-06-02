import Link from "next/link";
import { Search, UserPlus, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { getAdminUsersData, inviteCompanyUserAction } from "@/services/admin";
import { requirePlatformAdminContext } from "@/services/context";

type UsersPageProps = {
  searchParams: Promise<{ q?: string; tenant?: string }>;
};

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const [{ platformUser }, data, params] = await Promise.all([requirePlatformAdminContext(), getAdminUsersData(), searchParams]);
  const query = (params.q ?? "").toLowerCase();
  const tenantFilter = params.tenant ?? "all";
  const filtered = data.users.filter((user) => {
    const tenant = Array.isArray(user.tenants) ? user.tenants[0] : user.tenants;
    const haystack = [user.email, user.full_name, user.role, tenant?.name, tenant?.slug].filter(Boolean).join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (tenantFilter === "all" || user.tenant_id === tenantFilter);
  });

  return (
    <AdminShell email={platformUser.email}>
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Invitaciones y directorio cruzado de usuarios por compania.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={inviteCompanyUserAction} className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company_id">Compania</Label>
                <Select id="company_id" name="company_id" required>
                  <option value="">Seleccionar</option>
                  {data.tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
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
              <div className="md:col-span-5">
                <Button type="submit">
                  <UserPlus className="h-4 w-4" />
                  Enviar invitacion
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <form className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4" />
                  Directorio
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{filtered.length} usuarios.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9 sm:w-72" name="q" placeholder="Buscar usuario" defaultValue={params.q ?? ""} />
                </div>
                <Select className="sm:w-52" name="tenant" defaultValue={tenantFilter}>
                  <option value="all">Todas</option>
                  {data.tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </Select>
                <Button type="submit" variant="outline">Filtrar</Button>
              </div>
            </form>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border/70 bg-secondary/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Usuario</th>
                  <th className="px-5 py-3 font-medium">Compania</th>
                  <th className="px-5 py-3 font-medium">Rol</th>
                  <th className="px-5 py-3 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      {relationTenant(user.tenants) ? (
                        <Link className="font-medium text-primary hover:underline" href={`/admin/companies/${relationTenant(user.tenants)?.id}`}>{relationTenant(user.tenants)?.name}</Link>
                      ) : (
                        "Sin compania"
                      )}
                    </td>
                    <td className="px-5 py-3"><Badge variant="secondary">{user.role}</Badge></td>
                    <td className="px-5 py-3">{formatDate(user.created_at)}</td>
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

function relationTenant(value: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null) {
  return Array.isArray(value) ? value[0] : value;
}
