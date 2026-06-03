export function cleanMoneyInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

export function formatMoneyInput(value: number | string) {
  if (typeof value === "number") return value === 0 ? "" : String(value);
  return value;
}

export function parseMoneyInput(value: number | string) {
  const parsed = Number(String(value || 0).replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.round((safeValue + Number.EPSILON) * 100) / 100;
}
