export const mappingTargets = [
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

export const editableNumericFields = [
  ["cost", "Costo"],
  ["sale_price", "Precio venta"],
  ["current_stock", "Stock"],
] as const;

export const separatorWords = new Set([
  "SAMSUNG",
  "IPHONE",
  "FLEXORES",
  "CARGA",
  "PANTALLAS",
  "BATERIAS",
  "TAPAS",
  "CRISTALES",
  "BOCINAS",
  "CARCASAS",
]);
