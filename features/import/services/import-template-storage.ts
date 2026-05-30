const templatePrefix = "pulso-import-template";

export function loadImportTemplate(type: string) {
  const saved = window.localStorage.getItem(templateKey(type));
  return saved ? (JSON.parse(saved) as Record<string, string>) : {};
}

export function saveImportTemplate(type: string, mapping: Record<string, string>) {
  window.localStorage.setItem(templateKey(type), JSON.stringify(mapping));
}

function templateKey(type: string) {
  return `${templatePrefix}-${type}`;
}
