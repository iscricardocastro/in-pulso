import { AppShell } from "@/components/app-shell";
import { PurchaseOrdersView } from "@/features/purchase-orders/purchase-orders-view";
import { getCatalogItems } from "@/services/catalogs";
import { getProducts } from "@/services/products";
import { getPurchaseOrders } from "@/services/purchase-orders";
import { getSuppliers } from "@/services/suppliers";

type PurchaseOrdersPageProps = {
  searchParams: Promise<{ status?: string; arrival?: string; stage?: string; create?: string }>;
};

export default async function PurchaseOrdersPage({ searchParams }: PurchaseOrdersPageProps) {
  const { status, arrival, stage, create } = await searchParams;
  const [products, suppliers, orders, catalogs] = await Promise.all([getProducts(), getSuppliers(), getPurchaseOrders(), getCatalogItems()]);

  return (
    <AppShell>
      <PurchaseOrdersView
        products={products}
        suppliers={suppliers}
        orders={orders}
        catalogs={catalogs}
        statusFilter={status}
        arrivalFilter={arrival}
        stageFilter={stage}
        createMode={create}
      />
    </AppShell>
  );
}
