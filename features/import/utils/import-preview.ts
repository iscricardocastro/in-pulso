import { editableNumericFields, mappingTargets, separatorWords } from "@/features/import/constants";
import type { Cell, ImportColumn, PreviewRow, ProductDraft } from "@/features/import/types";

export function getPreviewStatus(row: PreviewRow) {
  if (row.ignored) return "Ignorada";
  if (row.errors.length > 0) return "Error";
  if (row.warnings.length > 0) return "Aviso";
  return "Lista";
}

export function getColumns(rows: Cell[][], headerIndex: number): ImportColumn[] {
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

export function detectHeaderRow(rows: Cell[][]) {
  const index = rows.findIndex((row) => row.filter(hasValue).length >= 2);
  return index === -1 ? 0 : index;
}

export function buildPreview(
  rows: Cell[][],
  columns: ImportColumn[],
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

export function applyEditedRows(rows: PreviewRow[], editedRows: Record<number, ProductDraft>) {
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

export function hasProductName(product: ProductDraft) {
  return normalizeText(product.name).length >= 2;
}

export function sanitizeImportProduct(product: ProductDraft) {
  const sanitized = { ...product };
  for (const [key] of editableNumericFields) {
    const value = sanitized[key];
    if (isInvalidNumber(value) || (toNumber(value) ?? 0) < 0) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export function parseCsv(text: string): Cell[][] {
  return text.split(/\r?\n/).filter(Boolean).map(splitCsvLine);
}

export function normalizeText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
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

function isSeparatorRow(source: Record<string, Cell>) {
  const values = Object.values(source).filter(hasValue).map(normalizeText).filter(Boolean);
  if (values.length === 0) return true;
  if (values.length === 1) {
    const value = values[0];
    return /^[A-Z0-9 /.-]{3,40}$/.test(value) || separatorWords.has(value.toUpperCase());
  }
  return false;
}

function duplicateKey(product: ProductDraft) {
  return [product.brand, product.model, product.category, product.variant, product.supplier]
    .map((value) => normalizeText(value).toLowerCase())
    .join("|");
}

function hasValue(value: Cell) {
  return value !== null && value !== undefined && String(value).trim() !== "";
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
