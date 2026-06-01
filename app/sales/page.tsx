import { AppShell } from "@/components/app-shell";
import { SalesView } from "@/features/sales/sales-view";
import { getCatalogItems } from "@/services/catalogs";
import { requireUserContext } from "@/services/context";
import { getCustomers } from "@/services/customers";
import { getSales } from "@/services/sales";

type SalesPageProps = {
  searchParams: Promise<{ detail?: string }>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const { detail } = await searchParams;
  const { supabase, profile } = await requireUserContext();
  const [catalogs, customers, sales, tenantResult] = await Promise.all([
    getCatalogItems(),
    getCustomers(),
    getSales(),
    supabase.from("tenants").select("id, name, slug").eq("id", profile.tenant_id).single(),
  ]);

  if (tenantResult.error) throw new Error(tenantResult.error.message);

  return (
    <AppShell>
      <SalesView
        catalogs={catalogs}
        customers={customers}
        initialDetailSaleNumber={detail}
        sales={sales}
        receiptContext={{
          company: tenantResult.data,
          seller: {
            email: profile.email,
            full_name: profile.full_name,
          },
        }}
      />
    </AppShell>
  );
}
