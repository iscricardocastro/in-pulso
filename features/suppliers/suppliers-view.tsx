"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SupplierForm } from "@/features/suppliers/supplier-form";
import { useFormReveal } from "@/hooks/use-form-reveal";
import { deleteSupplier } from "@/services/suppliers";
import type { Supplier } from "@/types/database";

export function SuppliersView({ suppliers }: { suppliers: Supplier[] }) {
  const [showCreate, setShowCreate] = useState(suppliers.length === 0);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const { formRef, revealForm } = useFormReveal<HTMLDivElement>();

  const columns = useMemo<ColumnDef<Supplier>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "contact",
        header: "Contacto",
        cell: ({ row }) => row.original.contact || "-",
      },
      {
        accessorKey: "phone",
        header: "Telefono",
        cell: ({ row }) => row.original.phone || "-",
      },
      {
        accessorKey: "email",
        header: "Correo",
        cell: ({ row }) => row.original.email || "-",
      },
      {
        accessorKey: "country",
        header: "Pais",
        cell: ({ row }) => row.original.country || "-",
      },
      {
        accessorKey: "average_delivery_days",
        header: "Entrega",
        cell: ({ row }) => `${row.original.average_delivery_days} dias`,
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
              title="Eliminar proveedor"
              description={`Seguro que quieres eliminar "${row.original.name}"? Esta accion no se puede deshacer.`}
              onConfirm={async () => {
                try {
                  await deleteSupplier(row.original.id);
                  toast.success("Proveedor eliminado");
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
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Contactos, entrega promedio y condiciones para compras veloces.</p>
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
          {showCreate ? "Cerrar" : "Nuevo proveedor"}
        </Button>
      </div>

      {showCreate ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Crear proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierForm key="create-supplier" onCancel={() => setShowCreate(false)} onSaved={() => setShowCreate(false)} />
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Editar proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierForm
              key={editing.id}
              supplier={editing}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={suppliers}
        emptyState={<EmptyState icon={Truck} title="Sin proveedores" description="Crea proveedores para relacionarlos con productos y ordenes." />}
      />
    </div>
  );
}
