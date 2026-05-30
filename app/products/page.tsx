import { AppShell } from "@/components/app-shell";
import { ProductsTable } from "@/features/products/products-table";
import { getCatalogItems } from "@/services/catalogs";
import { getProducts } from "@/services/products";
import { getSuppliers } from "@/services/suppliers";

type ProductsPageProps = {
  searchParams: Promise<{ stock?: string }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { stock } = await searchParams;
  const [products, suppliers, catalogs] = await Promise.all([getProducts(), getSuppliers(), getCatalogItems()]);

  return (
    <AppShell>
      <ProductsTable catalogs={catalogs} products={products} suppliers={suppliers} stockFilter={stock} />
    </AppShell>
  );
}
