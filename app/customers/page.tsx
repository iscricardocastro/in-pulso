import { AppShell } from "@/components/app-shell";
import { CustomersView } from "@/features/customers/customers-view";
import { getCustomers } from "@/services/customers";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <AppShell>
      <CustomersView customers={customers} />
    </AppShell>
  );
}
