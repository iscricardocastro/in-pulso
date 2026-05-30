import { AppShell } from "@/components/app-shell";
import { SuppliersView } from "@/features/suppliers/suppliers-view";
import { getSuppliers } from "@/services/suppliers";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <AppShell>
      <SuppliersView suppliers={suppliers} />
    </AppShell>
  );
}
