import { AppShell } from "@/components/app-shell";
import { DebtorsView } from "@/features/debtors/debtors-view";
import { getCatalogItems } from "@/services/catalogs";
import { getDebtors } from "@/services/debtors";

export default async function DebtorsPage() {
  const [debtors, catalogs] = await Promise.all([getDebtors(), getCatalogItems()]);
  const paymentMethods = catalogs.filter((item) => item.kind === "payment_method");

  return (
    <AppShell>
      <DebtorsView debtors={debtors} paymentMethods={paymentMethods} />
    </AppShell>
  );
}
