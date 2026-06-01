import { AppShell } from "@/components/app-shell";
import { DebtorsView } from "@/features/debtors/debtors-view";
import { getCatalogItems } from "@/services/catalogs";
import { getDebtors } from "@/services/debtors";

type DebtorsPageProps = {
  searchParams: Promise<{ customer?: string; sale?: string }>;
};

export default async function DebtorsPage({ searchParams }: DebtorsPageProps) {
  const { customer, sale } = await searchParams;
  const [debtors, catalogs] = await Promise.all([getDebtors(), getCatalogItems()]);
  const paymentMethods = catalogs.filter((item) => item.kind === "payment_method");

  return (
    <AppShell>
      <DebtorsView
        debtors={debtors}
        initialCustomerId={customer}
        initialSaleNumber={sale}
        key={`${customer ?? ""}:${sale ?? ""}`}
        paymentMethods={paymentMethods}
      />
    </AppShell>
  );
}
