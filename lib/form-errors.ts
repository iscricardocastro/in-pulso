import type { FieldErrors, FieldValues } from "react-hook-form";

export function getFirstFieldErrorMessage<T extends FieldValues>(errors: FieldErrors<T>, fallback = "Revisa los campos marcados") {
  const firstError = Object.values(errors)[0]?.message;
  return typeof firstError === "string" ? firstError : fallback;
}
