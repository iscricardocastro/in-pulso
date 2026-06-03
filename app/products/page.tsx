import { AppShell } from "@/components/app-shell";
import { ProductsTable } from "@/features/products/products-table";
import { getCatalogItems } from "@/services/catalogs";
import { getActiveProductPropertyDefinitions, getProductPropertyOptions } from "@/services/product-properties";
import { getProducts } from "@/services/products";
import { getSuppliers } from "@/services/suppliers";

type ProductsPageProps = {
  searchParams: Promise<{ q?: string; stock?: string }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { q, stock } = await searchParams;
  const [products, suppliers, catalogs, propertyDefinitions, propertyOptions] = await Promise.all([
    getProducts(),
    getSuppliers(),
    getCatalogItems(),
    getActiveProductPropertyDefinitions(),
    getProductPropertyOptions(),
  ]);

  return (
    <AppShell>
      <ProductsTable
        catalogs={catalogs}
        initialQuery={q}
        products={products}
        propertyDefinitions={propertyDefinitions}
        propertyOptions={propertyOptions}
        suppliers={suppliers}
        stockFilter={stock}
      />
    </AppShell>
  );
}
