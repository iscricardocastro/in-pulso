export type ReceiptPrintSize = "thermal-80" | "standard";

export const RECEIPT_PRINT_SIZE_KEY = "pulso-receipt-print-size";

export function getSavedReceiptPrintSize(): ReceiptPrintSize {
  if (typeof window === "undefined") return "thermal-80";
  const saved = window.localStorage.getItem(RECEIPT_PRINT_SIZE_KEY);
  return saved === "thermal-80" || saved === "standard" ? saved : "thermal-80";
}

export function saveReceiptPrintSize(size: ReceiptPrintSize) {
  window.localStorage.setItem(RECEIPT_PRINT_SIZE_KEY, size);
}
