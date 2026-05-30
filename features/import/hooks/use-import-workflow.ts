"use client";

import { type ChangeEvent, useMemo, useState, useTransition } from "react";
import readXlsxFile from "read-excel-file/browser";
import { toast } from "sonner";
import { loadImportTemplate, saveImportTemplate } from "@/features/import/services/import-template-storage";
import type { ProductDraft, WorkbookSheet } from "@/features/import/types";
import {
  applyEditedRows,
  buildPreview,
  detectHeaderRow,
  getColumns,
  hasProductName,
  parseCsv,
  sanitizeImportProduct,
} from "@/features/import/utils/import-preview";
import { importProducts } from "@/services/products";
import type { CatalogItem } from "@/types/database";

export function useImportWorkflow(categories: CatalogItem[]) {
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
    handleLoadTemplate(selectedCategory);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) readFile(file).catch(() => toast.error("No se pudo leer archivo"));
  }

  function handleSheetChange(value: string) {
    const sheet = sheets.find((entry) => entry.sheet === value);
    setSelectedSheet(value);
    setHeaderRow(detectHeaderRow(sheet?.data ?? []) + 1);
  }

  function handleCategoryChange(name: string) {
    setSelectedCategory(name);
    handleLoadTemplate(name);
  }

  function handleMappingChange(key: string, value: string) {
    setMapping((current) => ({ ...current, [key]: value }));
  }

  function handleHeaderRowChange(value: number) {
    setHeaderRow(value);
  }

  function handleLoadTemplate(type: string) {
    setMapping(loadImportTemplate(type));
  }

  function handleSaveTemplate() {
    saveImportTemplate(selectedCategory, mapping);
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

  return {
    fileName,
    sheets,
    selectedSheet,
    headerRow,
    selectedCategory,
    mapping,
    columns,
    preview,
    importableRows,
    errorCount,
    warningCount,
    ignoredCount,
    importError,
    pending,
    editPreview,
    handleCategoryChange,
    handleFileChange,
    handleHeaderRowChange,
    handleMappingChange,
    handleSaveTemplate,
    handleSheetChange,
    runImport,
  };
}
