import { AppShell } from "@/components/app-shell";
import { SalesView } from "@/features/sales/sales-view";
import { getCatalogItems } from "@/services/catalogs";
import { getCustomers } from "@/services/customers";
import { getSales } from "@/services/sales";

export default async function SalesPage() {
  const [catalogs, customers, sales] = await Promise.all([getCatalogItems(), getCustomers(), getSales()]);

  return (
    <AppShell>
      <SalesView catalogs={catalogs} customers={customers} sales={sales} />
    </AppShell>
  );
}
