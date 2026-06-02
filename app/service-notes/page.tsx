import { AppShell } from "@/components/app-shell";
import { ServiceNotesView } from "@/features/service-notes/service-notes-view";
import { getCatalogItems } from "@/services/catalogs";
import { requireUserContext } from "@/services/context";
import { getCustomers } from "@/services/customers";
import { getServiceNotes, getServiceTemplates } from "@/services/service-notes";

export default async function ServiceNotesPage() {
  const { supabase, profile } = await requireUserContext();
  const [catalogs, customers, notes, templates, tenantResult] = await Promise.all([
    getCatalogItems(),
    getCustomers(),
    getServiceNotes(),
    getServiceTemplates(),
    supabase.from("tenants").select("id, name, slug").eq("id", profile.tenant_id).single(),
  ]);

  if (tenantResult.error) throw new Error(tenantResult.error.message);

  return (
    <AppShell>
      <ServiceNotesView
        catalogs={catalogs}
        customers={customers}
        notes={notes}
        receiptContext={{
          company: tenantResult.data,
          seller: {
            email: profile.email,
            full_name: profile.full_name,
          },
        }}
        templates={templates}
      />
    </AppShell>
  );
}
