import { AppShell } from "@/components/app-shell";
import { CatalogsView } from "@/features/catalogs/catalogs-view";
import { getCatalogItems } from "@/services/catalogs";
import { getSuppliers } from "@/services/suppliers";

export default async function CatalogsPage() {
  const [items, suppliers] = await Promise.all([getCatalogItems(), getSuppliers()]);

  return (
    <AppShell>
      <CatalogsView items={items} suppliers={suppliers} />
    </AppShell>
  );
}
