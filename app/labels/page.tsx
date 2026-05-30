import { AppShell } from "@/components/app-shell";
import { LabelsView } from "@/features/labels/labels-view";
import { getProducts } from "@/services/products";

export default async function LabelsPage() {
  const products = await getProducts();

  return (
    <AppShell>
      <LabelsView products={products} />
    </AppShell>
  );
}
