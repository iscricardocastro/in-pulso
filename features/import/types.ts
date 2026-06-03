export type Cell = string | number | boolean | Date | null | undefined;

export type WorkbookSheet = {
  sheet: string;
  data: Cell[][];
};

export type ImportColumn = {
  key: string;
  label: string;
};

export type PreviewRow = {
  rowNumber: number;
  ignored: boolean;
  warnings: string[];
  errors: string[];
  product: ProductDraft;
};

export type ProductDraft = Record<string, unknown>;

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export type MappingTarget = {
  key: string;
  label: string;
  propertyKey?: string;
};
