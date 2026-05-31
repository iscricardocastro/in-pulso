"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Mail, MapPin, Phone, Plus, Search, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { CustomerForm } from "@/features/customers/customer-form";
import { useFormReveal } from "@/hooks/use-form-reveal";
import { deleteCustomer } from "@/services/customers";
import type { Customer } from "@/types/database";

export function CustomersView({ customers }: { customers: Customer[] }) {
  const [showCreate, setShowCreate] = useState(customers.length === 0);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const { formRef, revealForm } = useFormReveal<HTMLDivElement>();

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "address",
        header: "Direccion",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-sm text-sm text-muted-foreground">
            {row.original.address || "-"}
          </span>
        ),
      },
      {
        id: "location",
        header: "Ubicacion",
        accessorFn: (row) => [row.postal_code, row.city, row.state, row.country].filter(Boolean).join(" "),
        cell: ({ row }) => {
          const location = [row.original.postal_code, row.original.city, row.original.state, row.original.country]
            .filter(Boolean)
            .join(", ");
          return location ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {location}
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        accessorKey: "phone",
        header: "Telefono",
        cell: ({ row }) =>
          row.original.phone ? (
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {row.original.phone}
            </span>
          ) : (
            "-"
          ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) =>
          row.original.email ? (
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {row.original.email}
            </span>
          ) : (
            "-"
          ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        meta: { headerClassName: "text-right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreate(false);
                setEditing(row.original);
                revealForm();
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDeleteButton
              title="Eliminar cliente"
              description={`Seguro que quieres eliminar "${row.original.name}"? Esta accion no se puede deshacer.`}
              onConfirm={async () => {
                try {
                  await deleteCustomer(row.original.id);
                  toast.success("Cliente eliminado");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
                  throw error;
                }
              }}
            />
          </div>
        ),
      },
    ],
    [revealForm],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Directorio ligero para ventas, contacto y entregas.</p>
        </div>
        <Button
          type="button"
          variant={showCreate ? "secondary" : "default"}
          onClick={() => {
            setEditing(null);
            setShowCreate((value) => !value);
            if (!showCreate) revealForm();
          }}
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Cerrar" : "Nuevo cliente"}
        </Button>
      </div>

      {showCreate ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Crear cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm key="create-customer" onCancel={() => setShowCreate(false)} onSaved={() => setShowCreate(false)} />
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Editar cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm
              key={editing.id}
              customer={editing}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={customers}
        emptyState={<EmptyState icon={UserRound} title="Sin clientes" description="Crea clientes con nombre y agrega contacto cuando lo necesites." />}
        globalFilter={query}
        header={
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar clientes"
              className="pl-10"
              placeholder="Buscar por nombre, ubicacion, telefono o email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        }
      />
    </div>
  );
}
