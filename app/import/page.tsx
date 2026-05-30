import { AppShell } from "@/components/app-shell";
import { ImportView } from "@/features/import/import-view";
import { getCatalogItems } from "@/services/catalogs";

export default async function ImportPage() {
  const catalogItems = await getCatalogItems();
  const categories = catalogItems.filter((item) => item.kind === "category");

  return (
    <AppShell>
      <ImportView categories={categories} />
    </AppShell>
  );
}
