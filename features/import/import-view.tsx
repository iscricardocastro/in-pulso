"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Save, Upload } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/features/import/components/searchable-select";
import { mappingTargets } from "@/features/import/constants";
import { useImportWorkflow } from "@/features/import/hooks/use-import-workflow";
import type { PreviewRow } from "@/features/import/types";
import { getPreviewStatus } from "@/features/import/utils/import-preview";
import { createCatalogItem } from "@/services/catalogs";
import type { CatalogItem } from "@/types/database";

export function ImportView({ categories }: { categories: CatalogItem[] }) {
  const workflow = useImportWorkflow(categories);
  const previewColumns = useMemo<ColumnDef<PreviewRow>[]>(
    () => [
      {
        accessorKey: "rowNumber",
        header: "Fila",
      },
      {
        id: "status",
        header: "Estado",
        accessorFn: (row) => getPreviewStatus(row),
        cell: ({ row }) => {
          const previewRow = row.original;

          return previewRow.ignored ? (
            <Badge variant="secondary">Ignorada</Badge>
          ) : previewRow.errors.length > 0 ? (
            <Badge variant="destructive">Error</Badge>
          ) : previewRow.warnings.length > 0 ? (
            <Badge variant="warning">Aviso</Badge>
          ) : (
            <Badge variant="success">Lista</Badge>
          );
        },
      },
      {
        id: "name",
        header: "Producto",
        accessorFn: (row) => String(row.product.name ?? ""),
        meta: { cellClassName: "min-w-64" },
        cell: ({ row }) => (
          <EditablePreviewInput
            disabled={row.original.ignored}
            label="Producto"
            value={row.original.product.name}
            onChange={(value) => workflow.editPreview(row.original.rowNumber, "name", value)}
          />
        ),
      },
      {
        id: "supplier",
        header: "Proveedor",
        accessorFn: (row) => String(row.product.supplier ?? ""),
        meta: { cellClassName: "min-w-44" },
        cell: ({ row }) => (
          <EditablePreviewInput
            disabled={row.original.ignored}
            label="Proveedor"
            value={row.original.product.supplier}
            onChange={(value) => workflow.editPreview(row.original.rowNumber, "supplier", value)}
          />
        ),
      },
      {
        id: "cost",
        header: "Costo",
        accessorFn: (row) => Number(row.product.cost || 0),
        meta: { cellClassName: "min-w-32" },
        cell: ({ row }) => (
          <EditablePreviewInput
            disabled={row.original.ignored}
            label="Costo"
            value={row.original.product.cost}
            onChange={(value) => workflow.editPreview(row.original.rowNumber, "cost", value)}
          />
        ),
      },
      {
        id: "sale_price",
        header: "Precio venta",
        accessorFn: (row) => Number(row.product.sale_price || 0),
        meta: { cellClassName: "min-w-36" },
        cell: ({ row }) => (
          <EditablePreviewInput
            disabled={row.original.ignored}
            label="Precio venta"
            value={row.original.product.sale_price}
            onChange={(value) => workflow.editPreview(row.original.rowNumber, "sale_price", value)}
          />
        ),
      },
      {
        id: "current_stock",
        header: "Stock",
        accessorFn: (row) => Number(row.product.current_stock || 0),
        meta: { cellClassName: "min-w-28" },
        cell: ({ row }) => (
          <EditablePreviewInput
            disabled={row.original.ignored}
            label="Stock"
            value={row.original.product.current_stock}
            onChange={(value) => workflow.editPreview(row.original.rowNumber, "current_stock", value)}
          />
        ),
      },
      {
        id: "validation",
        header: "Validacion",
        accessorFn: (row) => [...row.errors, ...row.warnings].join(" "),
        meta: { cellClassName: "min-w-72" },
        cell: ({ row }) =>
          [...row.original.errors, ...row.original.warnings].join(" · ") ||
          (row.original.ignored ? "Encabezado/separador/decorativo" : "OK"),
      },
    ],
    [workflow],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar inventario</h1>
        <p className="text-sm text-muted-foreground">
          Excel flexible con hojas multiples, mapeo manual, plantillas y preview validado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cargar archivo Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/50">
            <FileSpreadsheet className="mb-3 h-9 w-9 text-muted-foreground" />
            <span className="font-medium">{workflow.fileName || "Selecciona Excel o CSV"}</span>
            <span className="text-sm text-muted-foreground">El sistema detecta hojas y columnas antes de importar.</span>
            <Input accept=".xlsx,.csv" className="sr-only" type="file" onChange={workflow.handleFileChange} />
          </label>
        </CardContent>
      </Card>

      {workflow.sheets.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Hoja y plantilla</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Hoja</Label>
                <SearchableSelect
                  options={workflow.sheets.map((sheet) => ({ value: sheet.sheet, label: sheet.sheet }))}
                  placeholder="Buscar hoja"
                  value={workflow.selectedSheet}
                  onChange={workflow.handleSheetChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Fila de encabezados</Label>
                <Input
                  min={1}
                  type="number"
                  value={workflow.headerRow}
                  onChange={(event) => workflow.handleHeaderRowChange(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <CreatableCombobox
                  createSuccessMessage="Categoria agregada"
                  emptyLabel="Sin categorias"
                  options={categories}
                  placeholder="Buscar categoria"
                  value={workflow.selectedCategory}
                  onChange={workflow.handleCategoryChange}
                  onCreate={(name) => createCatalogItem("category", name)}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" type="button" variant="outline" onClick={workflow.handleSaveTemplate}>
                  <Save className="h-4 w-4" />
                  Guardar plantilla
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapeo de columnas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              {mappingTargets.map((target) => (
                <div key={target.key} className="space-y-2">
                  <Label>{target.label}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: "No mapear" },
                      ...workflow.columns.map((column) => ({ value: column.key, label: column.label })),
                    ]}
                    placeholder="Buscar columna"
                    value={workflow.mapping[target.key] ?? ""}
                    onChange={(value) => workflow.handleMappingChange(target.key, value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <section className="grid gap-3 md:grid-cols-4">
            <StatusCard label="Listos" value={workflow.importableRows.length} ok />
            <StatusCard label="Ignorados" value={workflow.ignoredCount} />
            <StatusCard label="Errores" value={workflow.errorCount} danger={workflow.errorCount > 0} />
            <StatusCard label="Avisos" value={workflow.warningCount} />
          </section>

          {workflow.importError ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex gap-3 p-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{workflow.importError}</p>
              </CardContent>
            </Card>
          ) : null}

          <DataTable
            columns={previewColumns}
            data={workflow.preview}
            emptyState={<EmptyState icon={FileSpreadsheet} title="Sin preview" description="Carga una hoja con filas para validar." />}
            header={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Preview antes de importar</CardTitle>
                <Button disabled={workflow.pending || workflow.importableRows.length === 0} type="button" onClick={workflow.runImport}>
                  <Upload className="h-4 w-4" />
                  {workflow.pending ? "Importando..." : "Importar filas importables"}
                </Button>
              </div>
            }
          />
        </>
      ) : null}
    </div>
  );
}

function StatusCard({ label, value, ok, danger }: { label: string; value: number; ok?: boolean; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        {danger ? <AlertTriangle className="h-5 w-5 text-destructive" /> : ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
      </CardContent>
    </Card>
  );
}

function EditablePreviewInput({
  disabled,
  label,
  value,
  onChange,
}: {
  disabled?: boolean;
  label: string;
  value: unknown;
  onChange: (value: string) => void;
}) {
  if (disabled) return <span className="text-muted-foreground">-</span>;
  return (
    <Input
      aria-label={label}
      className="h-8 min-w-0 rounded-md px-2 py-1"
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
