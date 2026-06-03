"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Settings2, Tags, Truck, X } from "lucide-react";
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
import { SupplierForm } from "@/features/suppliers/supplier-form";
import { useFormReveal } from "@/hooks/use-form-reveal";
import { slugKey } from "@/lib/slug";
import { deleteCatalogItem, upsertCatalogItem } from "@/services/catalogs";
import {
  createProductPropertyOption,
  disableProductPropertyDefinition,
  upsertProductPropertyDefinition,
} from "@/services/product-properties";
import { deleteSupplier } from "@/services/suppliers";
import type {
  CatalogItem,
  CatalogKind,
  ProductPropertyDefinition,
  ProductPropertyOption,
  ProductPropertyType,
  Supplier,
} from "@/types/database";

const labels: Record<CatalogKind, string> = {
  brand: "Marca",
  model: "Modelo",
  category: "Categoria",
  variant: "Variante / Calidad",
  payment_method: "Metodo de pago",
};

type CatalogSection = CatalogKind | "supplier" | "product_template";

const sectionLabels: Record<CatalogSection, string> = {
  ...labels,
  supplier: "Proveedor",
  product_template: "Plantilla de producto",
};

const catalogSections: CatalogSection[] = ["product_template", "payment_method", "supplier"];

export function CatalogsView({
  items,
  suppliers,
  productPropertyDefinitions,
  productPropertyOptions,
}: {
  items: CatalogItem[];
  suppliers: Supplier[];
  productPropertyDefinitions: ProductPropertyDefinition[];
  productPropertyOptions: ProductPropertyOption[];
}) {
  const [section, setSection] = useState<CatalogSection>("product_template");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingProperty, setEditingProperty] = useState<ProductPropertyDefinition | null>(null);
  const [propertyForm, setPropertyForm] = useState({
    key: "",
    label: "",
    type: "text" as ProductPropertyType,
    required: false,
    searchable: true,
    filterable: true,
    display_order: 0,
    active: true,
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState(productPropertyDefinitions[0]?.id ?? "");
  const [optionValue, setOptionValue] = useState("");
  const [showForm, setShowForm] = useState(items.length === 0 && suppliers.length === 0);
  const [pending, startTransition] = useTransition();
  const { formRef, revealForm } = useFormReveal<HTMLDivElement>();
  const kind: CatalogKind = "payment_method";
  const isSupplierSection = section === "supplier";
  const isProductTemplateSection = section === "product_template";
  const filtered = useMemo(() => items.filter((item) => item.kind === "payment_method"), [items]);
  const formOpen = showForm || Boolean(editing) || Boolean(editingSupplier) || Boolean(editingProperty);

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
    setEditingProperty(null);
    setEditing(item);
    setSection(item.kind);
    setName(item.name);
    setShowForm(true);
    revealForm();
  }, [revealForm]);

  const editProperty = useCallback((property: ProductPropertyDefinition) => {
    setEditing(null);
    setEditingSupplier(null);
    setEditingProperty(property);
    setPropertyForm({
      key: property.key,
      label: property.label,
      type: property.type,
      required: property.required,
      searchable: property.searchable,
      filterable: property.filterable,
      display_order: property.display_order,
      active: property.active,
    });
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
  }

  const propertyColumns = useMemo<ColumnDef<ProductPropertyDefinition>[]>(
    () => [
      {
        accessorKey: "display_order",
        header: "Orden",
        cell: ({ row }) => row.original.display_order,
      },
      {
        accessorKey: "label",
        header: "Campo",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.label}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.original.key}</p>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Tipo",
      },
      {
        id: "flags",
        header: "Uso",
        cell: ({ row }) => [
          row.original.required ? "requerido" : null,
          row.original.searchable ? "busqueda" : null,
          row.original.filterable ? "tabla" : null,
        ].filter(Boolean).join(" · ") || "-",
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        meta: { headerClassName: "text-right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" type="button" variant="ghost" onClick={() => editProperty(row.original)}>
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDeleteButton
              disabled={pending || !row.original.active}
              title="Desactivar propiedad"
              description={`"${row.original.label}" se ocultara de captura e importacion, pero sus datos historicos quedan guardados.`}
              onConfirm={() => disableProductPropertyDefinition(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [editProperty, pending],
  );

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
    if (isProductTemplateSection) {
      saveProperty();
      return;
    }
    startTransition(async () => {
      try {
        await upsertCatalogItem({ id: editing?.id, kind, parent_id: null, name });
        toast.success(editing ? "Catalogo actualizado" : "Catalogo creado");
        setName("");
        setEditing(null);
        setShowForm(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });
  }

  function saveProperty() {
    startTransition(async () => {
      try {
        await upsertProductPropertyDefinition({ id: editingProperty?.id, ...propertyForm });
        toast.success(editingProperty ? "Propiedad actualizada" : "Propiedad creada");
        resetPropertyForm();
        setEditingProperty(null);
        setShowForm(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar propiedad");
      }
    });
  }

  function saveOption() {
    startTransition(async () => {
      try {
        await createProductPropertyOption({ definition_id: selectedPropertyId, value: optionValue });
        toast.success("Opcion agregada");
        setOptionValue("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo agregar opcion");
      }
    });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setEditingSupplier(null);
    setEditingProperty(null);
    setName("");
    resetPropertyForm();
  }

  function resetPropertyForm() {
    setPropertyForm({
      key: "",
      label: "",
      type: "text",
      required: false,
      searchable: true,
      filterable: true,
      display_order: productPropertyDefinitions.length * 10,
      active: true,
    });
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
          {formOpen ? "Cerrar" : isSupplierSection ? "Nuevo proveedor" : isProductTemplateSection ? "Nueva propiedad" : "Nuevo valor"}
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
              : isProductTemplateSection
                ? "Estos campos controlan productos e importacion. Si agregas un campo requerido, importacion pedira mapearlo."
                : section === "payment_method"
                  ? "Metodos reutilizables para registrar pagos de pedidos."
                  : "Alta y edicion de proveedores usados por productos y ordenes."}
          </p>
        </CardContent>
      </Card>

      {formOpen ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>
              {isSupplierSection
                ? (editingSupplier ? "Editar proveedor" : "Crear proveedor")
                : isProductTemplateSection
                  ? (editingProperty ? "Editar propiedad" : "Agregar propiedad")
                  : editing ? "Editar valor" : "Agregar valor"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSupplierSection ? (
              <SupplierForm
                key={editingSupplier?.id ?? "create-supplier"}
                supplier={editingSupplier ?? undefined}
                onCancel={closeForm}
                onSaved={closeForm}
              />
            ) : isProductTemplateSection ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Etiqueta</Label>
                  <Input
                    value={propertyForm.label}
                    onChange={(event) => {
                      const label = event.target.value;
                      setPropertyForm((current) => ({
                        ...current,
                        label,
                        key: current.key || slugKey(label, { prefixNumber: true }),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clave</Label>
                  <Input
                    value={propertyForm.key}
                    onChange={(event) => setPropertyForm((current) => ({ ...current, key: slugKey(event.target.value, { prefixNumber: true }) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={propertyForm.type} onChange={(event) => setPropertyForm((current) => ({ ...current, type: event.target.value as ProductPropertyType }))}>
                    <option value="text">Texto</option>
                    <option value="number">Numero</option>
                    <option value="date">Fecha</option>
                    <option value="boolean">Si/No</option>
                    <option value="option">Opcion</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={propertyForm.display_order}
                    onChange={(event) => setPropertyForm((current) => ({ ...current, display_order: Number(event.target.value) }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input checked={propertyForm.required} type="checkbox" onChange={(event) => setPropertyForm((current) => ({ ...current, required: event.target.checked }))} />
                  Requerido
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input checked={propertyForm.searchable} type="checkbox" onChange={(event) => setPropertyForm((current) => ({ ...current, searchable: event.target.checked }))} />
                  Buscar por este campo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input checked={propertyForm.filterable} type="checkbox" onChange={(event) => setPropertyForm((current) => ({ ...current, filterable: event.target.checked }))} />
                  Mostrar en tabla/import
                </label>
                <div className="flex justify-end gap-2 md:col-span-2">
                  <Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button>
                  <Button disabled={pending || !propertyForm.label.trim() || !propertyForm.key.trim()} type="button" onClick={save}>
                    <Plus className="h-4 w-4" />
                    {pending ? "Guardando..." : editingProperty ? "Guardar" : "Agregar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <Button disabled={pending || !name.trim()} type="button" onClick={save}>
                  <Plus className="h-4 w-4" />
                  {pending ? "Guardando..." : editing ? "Guardar" : "Agregar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isProductTemplateSection ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card className="xl:col-span-2">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Plantilla usada en productos e importacion</p>
                <p className="text-sm text-muted-foreground">
                  Agrega solo campos que el negocio necesita. Los campos requeridos deben mapearse al importar.
                </p>
              </div>
            </CardContent>
          </Card>
          <DataTable
            columns={propertyColumns}
            data={productPropertyDefinitions}
            emptyState={<EmptyState icon={Settings2} title="Sin plantilla" description="Agrega campos para adaptar productos al negocio." />}
          />
          <Card>
            <CardHeader>
              <CardTitle>Opciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Propiedad</Label>
                <Select value={selectedPropertyId} onChange={(event) => setSelectedPropertyId(event.target.value)}>
                  {productPropertyDefinitions.map((property) => (
                    <option key={property.id} value={property.id}>{property.label}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input value={optionValue} onChange={(event) => setOptionValue(event.target.value)} />
                <Button disabled={pending || !selectedPropertyId || !optionValue.trim()} size="icon" type="button" onClick={saveOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-72 space-y-2 overflow-auto">
                {productPropertyOptions
                  .filter((option) => option.definition_id === selectedPropertyId)
                  .map((option) => (
                    <div key={option.id} className="rounded-md border border-border px-3 py-2 text-sm">
                      {option.value}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : isSupplierSection ? (
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
              title="Sin valores"
              description="Agrega valores para reutilizarlos en el sistema."
            />
          }
        />
      )}
    </div>
  );
}
