"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Check, CheckCircle2, ChevronsUpDown, FileSpreadsheet, Save, Upload } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import readXlsxFile from "read-excel-file/browser";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createCatalogItem } from "@/services/catalogs";
import { importProducts } from "@/services/products";
import type { CatalogItem } from "@/types/database";

type Cell = string | number | boolean | Date | null | undefined;
type WorkbookSheet = { sheet: string; data: Cell[][] };
type PreviewRow = {
  rowNumber: number;
  ignored: boolean;
  warnings: string[];
  errors: string[];
  product: Record<string, unknown>;
};
type ProductDraft = Record<string, unknown>;

function getPreviewStatus(row: PreviewRow) {
  if (row.ignored) return "Ignorada";
  if (row.errors.length > 0) return "Error";
  if (row.warnings.length > 0) return "Aviso";
  return "Lista";
}

const mappingTargets = [
  { key: "brand", label: "Marca" },
  { key: "model", label: "Modelo" },
  { key: "variant", label: "Variante / Calidad" },
  { key: "sale_price", label: "Precio venta" },
  { key: "cost", label: "Costo compra" },
  { key: "suggested_price", label: "Precio sugerido" },
  { key: "initial_stock", label: "Inventario inicial" },
  { key: "sales", label: "Ventas" },
  { key: "current_stock", label: "Existencia actual" },
  { key: "minimum_stock", label: "Stock minimo" },
  { key: "supplier", label: "Proveedor" },
];

export function ImportView({ categories }: { categories: CatalogItem[] }) {
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<WorkbookSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name ?? "");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [editedRows, setEditedRows] = useState<Record<number, ProductDraft>>({});
  const [importError, setImportError] = useState("");
  const [pending, startTransition] = useTransition();

  const activeSheet = sheets.find((sheet) => sheet.sheet === selectedSheet);
  const columns = useMemo(() => getColumns(activeSheet?.data ?? [], headerRow - 1), [activeSheet, headerRow]);
  const basePreview = useMemo(
    () => buildPreview(activeSheet?.data ?? [], columns, mapping, headerRow - 1, selectedCategory),
    [activeSheet, columns, mapping, headerRow, selectedCategory],
  );
  const preview = useMemo(() => applyEditedRows(basePreview, editedRows), [basePreview, editedRows]);
  const importableRows = preview.filter((row) => !row.ignored && hasProductName(row.product));
  const errorCount = preview.reduce((total, row) => total + row.errors.length, 0);
  const warningCount = preview.reduce((total, row) => total + row.warnings.length, 0);
  const ignoredCount = preview.filter((row) => row.ignored).length;
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
            onChange={(value) => editPreview(row.original.rowNumber, "name", value)}
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
            onChange={(value) => editPreview(row.original.rowNumber, "supplier", value)}
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
            onChange={(value) => editPreview(row.original.rowNumber, "cost", value)}
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
            onChange={(value) => editPreview(row.original.rowNumber, "sale_price", value)}
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
            onChange={(value) => editPreview(row.original.rowNumber, "current_stock", value)}
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
    [],
  );

  async function readFile(file: File) {
    setFileName(file.name);
    const parsedSheets = file.name.toLowerCase().endsWith(".csv")
      ? [{ sheet: "CSV", data: parseCsv(await file.text()) }]
      : ((await readXlsxFile(file)) as unknown as WorkbookSheet[]);

    setSheets(parsedSheets);
    const firstSheet = parsedSheets[0]?.sheet ?? "";
    setSelectedSheet(firstSheet);
    setHeaderRow(detectHeaderRow(parsedSheets[0]?.data ?? []) + 1);
    setEditedRows({});
    setImportError("");
    loadTemplate(selectedCategory);
  }

  function loadTemplate(type: string) {
    const saved = window.localStorage.getItem(templateKey(type));
    setMapping(saved ? (JSON.parse(saved) as Record<string, string>) : {});
  }

  function saveTemplate() {
    window.localStorage.setItem(templateKey(selectedCategory), JSON.stringify(mapping));
    toast.success(`Plantilla guardada para ${selectedCategory || "sin categoria"}`);
  }

  function editPreview(rowNumber: number, key: string, value: string) {
    setEditedRows((current) => ({
      ...current,
      [rowNumber]: {
        ...current[rowNumber],
        [key]: value,
      },
    }));
  }

  function runImport() {
    if (importableRows.length === 0) {
      toast.error("No hay filas con nombre para importar");
      return;
    }

    startTransition(async () => {
      try {
        setImportError("");
        const count = await importProducts(importableRows.map((row) => sanitizeImportProduct(row.product)));
        toast.success(`${count} productos importados`);
        setSheets([]);
        setFileName("");
        setEditedRows({});
      } catch (error) {
        const message = error instanceof Error ? error.message : "Importacion fallida";
        setImportError(message);
        toast.error(message);
      }
    });
  }

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
            <span className="font-medium">{fileName || "Selecciona Excel o CSV"}</span>
            <span className="text-sm text-muted-foreground">El sistema detecta hojas y columnas antes de importar.</span>
            <Input
              accept=".xlsx,.csv"
              className="sr-only"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) readFile(file).catch(() => toast.error("No se pudo leer archivo"));
              }}
            />
          </label>
        </CardContent>
      </Card>

      {sheets.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Hoja y plantilla</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Hoja</Label>
                <SearchableSelect
                  options={sheets.map((sheet) => ({ value: sheet.sheet, label: sheet.sheet }))}
                  placeholder="Buscar hoja"
                  value={selectedSheet}
                  onChange={(value) => {
                    const sheet = sheets.find((entry) => entry.sheet === value);
                    setSelectedSheet(value);
                    setHeaderRow(detectHeaderRow(sheet?.data ?? []) + 1);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Fila de encabezados</Label>
                <Input min={1} type="number" value={headerRow} onChange={(event) => setHeaderRow(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <CreatableCombobox
                  createSuccessMessage="Categoria agregada"
                  emptyLabel="Sin categorias"
                  options={categories}
                  placeholder="Buscar categoria"
                  value={selectedCategory}
                  onChange={(name) => {
                    setSelectedCategory(name);
                    loadTemplate(name);
                  }}
                  onCreate={(name) => createCatalogItem("category", name)}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" type="button" variant="outline" onClick={saveTemplate}>
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
                      ...columns.map((column) => ({ value: column.key, label: column.label })),
                    ]}
                    placeholder="Buscar columna"
                    value={mapping[target.key] ?? ""}
                    onChange={(value) => setMapping((current) => ({ ...current, [target.key]: value }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <section className="grid gap-3 md:grid-cols-4">
            <StatusCard label="Listos" value={importableRows.length} ok />
            <StatusCard label="Ignorados" value={ignoredCount} />
            <StatusCard label="Errores" value={errorCount} danger={errorCount > 0} />
            <StatusCard label="Avisos" value={warningCount} />
          </section>

          {importError ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex gap-3 p-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{importError}</p>
              </CardContent>
            </Card>
          ) : null}

          <DataTable
            columns={previewColumns}
            data={preview}
            emptyState={<EmptyState icon={FileSpreadsheet} title="Sin preview" description="Carga una hoja con filas para validar." />}
            header={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Preview antes de importar</CardTitle>
                <Button disabled={pending || importableRows.length === 0} type="button" onClick={runImport}>
                  <Upload className="h-4 w-4" />
                  {pending ? "Importando..." : "Importar filas importables"}
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

type SearchableSelectOption = {
  value: string;
  label: string;
};

function SearchableSelect({
  value,
  options,
  placeholder,
  emptyLabel = "Sin resultados",
  onChange,
}: {
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  emptyLabel?: string;
  onChange: (value: string) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const displayValue = open ? query : selected?.label ?? "";
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));

  function select(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function resetQuery() {
    window.setTimeout(() => setOpen(false), 120);
  }

  function openList() {
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
          className={cn(
            "h-10 cursor-pointer pr-10 shadow-xs",
            open &&
              "border-slate-400 bg-white ring-2 ring-slate-950/10 dark:border-slate-600 dark:bg-slate-950 dark:ring-white/10",
          )}
          placeholder={placeholder}
          value={displayValue}
          onBlur={resetQuery}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onClick={() => {
            if (!open) openList();
          }}
          onFocus={openList}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              resetQuery();
            }
            if (event.key === "Enter" && filtered[0]) {
              event.preventDefault();
              select(filtered[0]);
            }
          }}
        />
        <ChevronsUpDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform",
            open && "rotate-180 text-foreground",
          )}
        />
      </div>

      {open ? (
        <div
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-xl shadow-slate-950/10 ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:shadow-black/30 dark:ring-white/10"
          id={listId}
          role="listbox"
        >
          <div className="max-h-64 overflow-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                {emptyLabel}
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    aria-selected={isSelected}
                    key={`${option.value}-${option.label}`}
                    className={cn(
                      "flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-slate-900 dark:focus-visible:bg-slate-900",
                      isSelected &&
                        "bg-blue-50 font-medium text-blue-700 hover:bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/40",
                    )}
                    role="option"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(option)}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function templateKey(type: string) {
  return `pulso-import-template-${type}`;
}

function getColumns(rows: Cell[][], headerIndex: number) {
  const header = rows[Math.max(0, headerIndex)] ?? [];
  const width = Math.max(header.length, ...rows.slice(0, 20).map((row) => row.length), 0);
  return Array.from({ length: width }).map((_, index) => {
    const value = normalizeText(header[index]);
    return {
      key: `col_${index}`,
      label: value || `Columna ${index + 1}`,
    };
  });
}

function detectHeaderRow(rows: Cell[][]) {
  const index = rows.findIndex((row) => row.filter(hasValue).length >= 2);
  return index === -1 ? 0 : index;
}

function buildPreview(
  rows: Cell[][],
  columns: { key: string; label: string }[],
  mapping: Record<string, string>,
  headerIndex: number,
  selectedCategory: string,
) {
  const mapped = rows.slice(headerIndex + 1).map((row, index) => {
    const source = Object.fromEntries(columns.map((column, columnIndex) => [column.key, row[columnIndex]]));
    return toPreviewRow(source, mapping, headerIndex + index + 2, selectedCategory);
  });

  const keys = mapped.map((row) => duplicateKey(row.product));
  return mapped.map((row, index) => {
    if (!row.ignored && keys[index] && keys.filter((key) => key === keys[index]).length > 1) {
      row.warnings.push("Duplicado potencial");
    }
    return row;
  });
}

function applyEditedRows(rows: PreviewRow[], editedRows: Record<number, ProductDraft>) {
  return rows.map((row) => {
    const edits = editedRows[row.rowNumber];
    if (!edits || row.ignored) return row;

    const product = { ...row.product, ...edits };
    const errors = row.errors.filter((error) => error !== "Producto sin nombre");
    const warnings = row.warnings.filter((warning) => !warning.startsWith("Edicion invalida:"));

    if (!hasProductName(product)) errors.push("Producto sin nombre");
    for (const [key, label] of editableNumericFields) {
      const value = product[key];
      if (isInvalidNumber(value) || (toNumber(value) ?? 0) < 0) {
        warnings.push(`Edicion invalida: ${label} no se importara`);
      }
    }

    return {
      ...row,
      errors,
      warnings,
      product,
    };
  });
}

function toPreviewRow(
  source: Record<string, Cell>,
  mapping: Record<string, string>,
  rowNumber: number,
  selectedCategory: string,
): PreviewRow {
  if (isSeparatorRow(source)) {
    return { rowNumber, ignored: true, errors: [], warnings: [], product: {} };
  }

  const raw = Object.fromEntries(mappingTargets.map((target) => [target.key, source[mapping[target.key]]]));
  const brand = normalizeText(raw.brand);
  const model = normalizeText(raw.model);
  const category = selectedCategory;
  const variant = normalizeText(raw.variant);
  const sales = toNumber(raw.sales);
  const initialStock = toNumber(raw.initial_stock);
  const explicitCurrent = toNumber(raw.current_stock);
  const currentStock = explicitCurrent ?? Math.max(0, (initialStock ?? 0) - (sales ?? 0));
  const salePrice = toNumber(raw.sale_price);
  const suggestedPrice = toNumber(raw.suggested_price);
  const cost = toNumber(raw.cost) ?? 0;
  const minimumStock = toNumber(raw.minimum_stock) ?? 0;
  const name = [brand, model, variant].filter(Boolean).join(" ") || [category, model].filter(Boolean).join(" ");
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!name) errors.push("Producto sin nombre");
  if (isInvalidNumber(raw.cost) || cost < 0) warnings.push("Costo invalido: no se importara");
  if (isInvalidNumber(raw.sale_price) || (salePrice ?? 0) < 0) warnings.push("Precio venta invalido: no se importara");
  if (isInvalidNumber(raw.suggested_price) || (suggestedPrice ?? 0) < 0) warnings.push("Precio sugerido invalido: no se importara");
  if ([raw.initial_stock, raw.sales, raw.current_stock, raw.minimum_stock].some((value) => isInvalidNumber(value) || (toNumber(value) ?? 0) < 0)) {
    warnings.push("Stock negativo o invalido: no se importara");
  }

  return {
    rowNumber,
    ignored: false,
    errors,
    warnings,
    product: {
      name,
      brand,
      model,
      category,
      variant,
      cost: isInvalidNumber(raw.cost) || cost < 0 ? 0 : cost,
      sale_price: isInvalidNumber(raw.sale_price) || (salePrice ?? 0) < 0 ? "" : salePrice ?? "",
      suggested_price: isInvalidNumber(raw.suggested_price) || (suggestedPrice ?? 0) < 0 ? "" : suggestedPrice ?? salePrice ?? "",
      current_stock: [raw.initial_stock, raw.sales, raw.current_stock].some((value) => isInvalidNumber(value) || (toNumber(value) ?? 0) < 0)
        ? 0
        : currentStock,
      minimum_stock: isInvalidNumber(raw.minimum_stock) || minimumStock < 0 ? 0 : minimumStock,
      supplier: normalizeText(raw.supplier),
      notes: sales !== null && sales !== undefined ? `Ventas importadas: ${sales}` : "",
    },
  };
}

const editableNumericFields = [
  ["cost", "Costo"],
  ["sale_price", "Precio venta"],
  ["current_stock", "Stock"],
] as const;

function hasProductName(product: Record<string, unknown>) {
  return normalizeText(product.name).length >= 2;
}

function sanitizeImportProduct(product: Record<string, unknown>) {
  const sanitized = { ...product };
  for (const [key] of editableNumericFields) {
    const value = sanitized[key];
    if (isInvalidNumber(value) || (toNumber(value) ?? 0) < 0) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

function isSeparatorRow(source: Record<string, Cell>) {
  const values = Object.values(source).filter(hasValue).map(normalizeText).filter(Boolean);
  if (values.length === 0) return true;
  if (values.length === 1) {
    const value = values[0];
    return /^[A-Z0-9 /.-]{3,40}$/.test(value) || separatorWords.has(value.toUpperCase());
  }
  return false;
}

const separatorWords = new Set(["SAMSUNG", "IPHONE", "FLEXORES", "CARGA", "PANTALLAS", "BATERIAS", "TAPAS", "CRISTALES", "BOCINAS", "CARCASAS"]);

function duplicateKey(product: Record<string, unknown>) {
  return [product.brand, product.model, product.category, product.variant, product.supplier]
    .map((value) => normalizeText(value).toLowerCase())
    .join("|");
}

function hasValue(value: Cell) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).replace(/[$,\s]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function isInvalidNumber(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "" && toNumber(value) === null;
}

function parseCsv(text: string): Cell[][] {
  return text.split(/\r?\n/).filter(Boolean).map(splitCsvLine);
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}
