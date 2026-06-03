export function slugKey(value: string, options: { prefixNumber?: boolean } = {}) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return options.prefixNumber ? slug.replace(/^[0-9]/, "p_$&") : slug;
}
