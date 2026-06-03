import { AppShell } from "@/components/app-shell";
import { CatalogsView } from "@/features/catalogs/catalogs-view";
import { getCatalogItems } from "@/services/catalogs";
import { getProductPropertyDefinitions, getProductPropertyOptions } from "@/services/product-properties";
import { getSuppliers } from "@/services/suppliers";

export default async function CatalogsPage() {
  const [items, suppliers, propertyDefinitions, propertyOptions] = await Promise.all([
    getCatalogItems(),
    getSuppliers(),
    getProductPropertyDefinitions(),
    getProductPropertyOptions(),
  ]);

  return (
    <AppShell>
      <CatalogsView
        items={items}
        productPropertyDefinitions={propertyDefinitions}
        productPropertyOptions={propertyOptions}
        suppliers={suppliers}
      />
    </AppShell>
  );
}
