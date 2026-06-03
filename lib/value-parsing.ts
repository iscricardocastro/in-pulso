export function normalizeText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

export function parseNumberValue(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).replace(/[$,\s]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function isInvalidNumberValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "" && parseNumberValue(value) === null;
}
