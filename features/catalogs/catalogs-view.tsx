"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Tags, Truck, X } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { catalogKinds } from "@/features/catalogs/schemas";
import { SupplierForm } from "@/features/suppliers/supplier-form";
import { useFormReveal } from "@/hooks/use-form-reveal";
import { deleteCatalogItem, upsertCatalogItem } from "@/services/catalogs";
import { deleteSupplier } from "@/services/suppliers";
import type { CatalogItem, CatalogKind, Supplier } from "@/types/database";

const labels: Record<CatalogKind, string> = {
  brand: "Marca",
  model: "Modelo",
  category: "Categoria",
  variant: "Variante / Calidad",
  payment_method: "Metodo de pago",
};

type CatalogSection = CatalogKind | "supplier";

const sectionLabels: Record<CatalogSection, string> = {
  ...labels,
  supplier: "Proveedor",
};

const catalogSections: CatalogSection[] = [...catalogKinds, "supplier"];

export function CatalogsView({ items, suppliers }: { items: CatalogItem[]; suppliers: Supplier[] }) {
  const [section, setSection] = useState<CatalogSection>("brand");
  const [name, setName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(items.length === 0 && suppliers.length === 0);
  const [pending, startTransition] = useTransition();
  const { formRef, revealForm } = useFormReveal<HTMLDivElement>();
  const kind = section === "supplier" ? "brand" : section;
  const isSupplierSection = section === "supplier";
  const isModelSection = section === "model";
  const brands = useMemo(() => items.filter((item) => item.kind === "brand"), [items]);
  const filtered = useMemo(
    () => items.filter((item) => item.kind === kind && (!isModelSection || item.parent_id === selectedBrandId)),
    [items, kind, isModelSection, selectedBrandId],
  );
  const formOpen = showForm || Boolean(editing) || Boolean(editingSupplier);

  const editSupplier = useCallback((supplier: Supplier) => {
    setEditing(null);
    setEditingSupplier(supplier);
    setShowForm(true);
    revealForm();
  }, [revealForm]);

  const deleteSupplierWithToast = useCallback(async (supplier: Supplier) => {
    try {
      await deleteSupplier(supplier.id);
      toast.success("Proveedor eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
      throw error;
    }
  }, []);

  const editCatalogItem = useCallback((item: CatalogItem) => {
    setEditingSupplier(null);
    setEditing(item);
    setSection(item.kind);
    setSelectedBrandId(item.parent_id || "");
    setName(item.name);
    setShowForm(true);
    revealForm();
  }, [revealForm]);

  const deleteCatalogItemWithToast = useCallback(async (item: CatalogItem) => {
    try {
      await deleteCatalogItem(item.id);
      toast.success("Catalogo eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
      throw error;
    }
  }, []);

  function toggleForm() {
    if (formOpen) {
      closeForm();
      return;
    }
    setShowForm(true);
    revealForm();
  }

  function changeSection(value: CatalogSection) {
    closeForm();
    setSection(value);
    setSelectedBrandId("");
  }

  function changeSelectedBrand(value: string) {
    closeForm();
    setSelectedBrandId(value);
  }

  const supplierColumns = useMemo<ColumnDef<Supplier>[]>(
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
              onClick={() => editSupplier(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDeleteButton
              disabled={pending}
              title="Eliminar proveedor"
              description={`Seguro que quieres eliminar "${row.original.name}"? Esta accion no se puede deshacer.`}
              onConfirm={() => deleteSupplierWithToast(row.original)}
            />
          </div>
        ),
      },
    ],
    [deleteSupplierWithToast, editSupplier, pending],
  );
  const itemColumns = useMemo<ColumnDef<CatalogItem>[]>(
    () => [
      {
        accessorKey: "kind",
        header: "Catalogo",
        cell: ({ row }) => labels[row.original.kind],
      },
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
              onClick={() => editCatalogItem(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDeleteButton
              disabled={pending}
              title="Eliminar valor"
              description={`Seguro que quieres eliminar "${row.original.name}"? Esta accion no se puede deshacer.`}
              onConfirm={() => deleteCatalogItemWithToast(row.original)}
            />
          </div>
        ),
      },
    ],
    [deleteCatalogItemWithToast, editCatalogItem, pending],
  );

  function save() {
    startTransition(async () => {
      try {
        await upsertCatalogItem({ id: editing?.id, kind, parent_id: isModelSection ? selectedBrandId : null, name });
        toast.success(editing ? "Catalogo actualizado" : "Catalogo creado");
        setName("");
        setEditing(null);
        setShowForm(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setEditingSupplier(null);
    setName("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catalogos</h1>
          <p className="text-sm text-muted-foreground">
            Valores reutilizables para productos y proveedores con informacion completa.
          </p>
        </div>
        <Button
          type="button"
          variant={formOpen ? "secondary" : "default"}
          onClick={toggleForm}
        >
          {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {formOpen ? "Cerrar" : isSupplierSection ? "Nuevo proveedor" : "Nuevo valor"}
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-[260px_1fr] md:items-end">
          <div className="space-y-2">
            <Label>Catalogo</Label>
            <Select
              value={section}
              onChange={(event) => changeSection(event.target.value as CatalogSection)}
            >
              {catalogSections.map((entry) => (
                <option key={entry} value={entry}>
                  {sectionLabels[entry]}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSupplierSection
              ? "Alta y edicion de proveedores usados por productos y ordenes."
              : isModelSection
                ? "Modelos ligados a una marca para evitar opciones incorrectas al crear productos."
                : section === "payment_method"
                  ? "Metodos reutilizables para registrar pagos de pedidos."
                  : "Valores simples que alimentan los campos buscables del producto."}
          </p>
        </CardContent>
      </Card>

      {isModelSection ? (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[260px_1fr] md:items-end">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={selectedBrandId}
                onChange={(event) => changeSelectedBrand(event.target.value)}
              >
                <option value="">Selecciona marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">Selecciona marca para ver, crear o editar sus modelos.</p>
          </CardContent>
        </Card>
      ) : null}

      {formOpen ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>{isSupplierSection ? (editingSupplier ? "Editar proveedor" : "Crear proveedor") : editing ? "Editar valor" : "Agregar valor"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isSupplierSection ? (
              <SupplierForm
                key={editingSupplier?.id ?? "create-supplier"}
                supplier={editingSupplier ?? undefined}
                onCancel={closeForm}
                onSaved={closeForm}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input disabled={isModelSection && !selectedBrandId} value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <Button disabled={pending || !name.trim() || (isModelSection && !selectedBrandId)} type="button" onClick={save}>
                  <Plus className="h-4 w-4" />
                  {pending ? "Guardando..." : editing ? "Guardar" : "Agregar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isSupplierSection ? (
        <DataTable
          columns={supplierColumns}
          data={suppliers}
          emptyState={<EmptyState icon={Truck} title="Sin proveedores" description="Agrega proveedores para relacionarlos con productos y ordenes." />}
        />
      ) : (
        <DataTable
          columns={itemColumns}
          data={filtered}
          emptyState={
            <EmptyState
              icon={Tags}
              title={isModelSection && !selectedBrandId ? "Selecciona marca" : "Sin valores"}
              description={isModelSection && !selectedBrandId ? "Elige una marca para administrar sus modelos." : "Agrega valores para reutilizarlos en el sistema."}
            />
          }
        />
      )}
    </div>
  );
}
