"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { History, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MovementForm } from "@/features/movements/movement-form";
import { useAppStore } from "@/hooks/use-app-store";
import { useFormReveal } from "@/hooks/use-form-reveal";
import { formatDate } from "@/lib/utils";
import type { InventoryMovement, Product } from "@/types/database";

const movementLabels: Record<InventoryMovement["type"], string> = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Ajuste",
};

export function MovementsView({
  products,
  movements,
}: {
  products: Product[];
  movements: InventoryMovement[];
}) {
  const query = useAppStore((state) => state.query);
  const [showCreate, setShowCreate] = useState(movements.length === 0);
  const { formRef, revealForm } = useFormReveal<HTMLDivElement>();

  const columns = useMemo<ColumnDef<InventoryMovement>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        accessorKey: "user",
        header: "Usuario",
        cell: ({ row }) => row.original.users?.full_name || row.original.users?.email || "Usuario",
        sortingFn: (a, b) =>
          (a.original.users?.full_name || a.original.users?.email || "").localeCompare(
            b.original.users?.full_name || b.original.users?.email || "",
          ),
      },
      {
        id: "product",
        header: "Producto",
        accessorFn: (row) =>
          [row.products?.internal_code, row.products?.name, row.products?.model_item?.name || row.products?.model]
            .filter(Boolean)
            .join(" "),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.products?.name || "Producto"}</p>
            <p className="text-xs text-muted-foreground">
              {[row.original.products?.internal_code, row.original.products?.model_item?.name || row.original.products?.model]
                .filter(Boolean)
                .join(" · ") || "Sin codigo"}
            </p>
          </div>
        ),
        sortingFn: (a, b) => (a.original.products?.name || "").localeCompare(b.original.products?.name || ""),
      },
      {
        id: "type",
        header: "Tipo",
        accessorFn: (row) => movementLabels[row.type],
        cell: ({ row }) => (
          <Badge variant={row.original.type === "exit" ? "destructive" : row.original.type === "adjustment" ? "warning" : "success"}>
            {movementLabels[row.original.type]}
          </Badge>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Cantidad",
      },
      {
        accessorKey: "comment",
        header: "Comentario",
        cell: ({ row }) => <span className="block max-w-xs truncate">{row.original.comment || "Sin comentario"}</span>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-sm text-muted-foreground">Historial de entradas, salidas y ajustes manuales.</p>
        </div>
        <Button
          type="button"
          variant={showCreate ? "secondary" : "default"}
          onClick={() => {
            setShowCreate((value) => !value);
            if (!showCreate) revealForm();
          }}
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Cerrar" : "Nuevo movimiento"}
        </Button>
      </div>

      {showCreate ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Registrar movimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <MovementForm products={products} onCancel={() => setShowCreate(false)} onSaved={() => setShowCreate(false)} />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={movements}
        emptyState={
          <EmptyState
            icon={History}
            title="Sin historial"
            description="Registra entradas, salidas o ajustes para auditar cada cambio de inventario."
          />
        }
        globalFilter={query}
      />
    </div>
  );
}
