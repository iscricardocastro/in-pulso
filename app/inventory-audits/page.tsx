import { AppShell } from "@/components/app-shell";
import { InventoryAuditsView } from "@/features/inventory-audits/inventory-audits-view";
import { getCatalogItems } from "@/services/catalogs";
import { requireUserContext } from "@/services/context";
import { getInventoryAudits, getOpenInventoryAudit } from "@/services/inventory-audits";

export default async function InventoryAuditsPage() {
  const { supabase, profile } = await requireUserContext();
  const [catalogs, audits, openAudit, tenantResult] = await Promise.all([
    getCatalogItems(),
    getInventoryAudits(),
    getOpenInventoryAudit(),
    supabase.from("tenants").select("id, name, slug").eq("id", profile.tenant_id).single(),
  ]);

  if (tenantResult.error) throw new Error(tenantResult.error.message);

  return (
    <AppShell>
      <InventoryAuditsView
        audits={audits}
        catalogs={catalogs}
        openAudit={openAudit}
        receiptContext={{
          company: tenantResult.data,
          user: {
            email: profile.email,
            full_name: profile.full_name,
          },
        }}
      />
    </AppShell>
  );
}
