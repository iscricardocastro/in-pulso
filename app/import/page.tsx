import { AppShell } from "@/components/app-shell";
import { ImportView } from "@/features/import/import-view";
import { getCatalogItems } from "@/services/catalogs";
import {
  getProductImportTemplates,
  getActiveProductPropertyDefinitions,
  getProductPropertyOptions,
} from "@/services/product-properties";

export default async function ImportPage() {
  const [catalogItems, propertyDefinitions, propertyOptions, importTemplates] = await Promise.all([
    getCatalogItems(),
    getActiveProductPropertyDefinitions(),
    getProductPropertyOptions(),
    getProductImportTemplates(),
  ]);
  const categories = catalogItems.filter((item) => item.kind === "category");

  return (
    <AppShell>
      <ImportView
        categories={categories}
        importTemplates={importTemplates}
        propertyDefinitions={propertyDefinitions}
        propertyOptions={propertyOptions}
      />
    </AppShell>
  );
}
