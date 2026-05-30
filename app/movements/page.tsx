import { AppShell } from "@/components/app-shell";
import { MovementsView } from "@/features/movements/movements-view";
import { getMovements } from "@/services/movements";
import { getProducts } from "@/services/products";

export default async function MovementsPage() {
  const [products, movements] = await Promise.all([getProducts(), getMovements(100)]);

  return (
    <AppShell>
      <MovementsView products={products} movements={movements} />
    </AppShell>
  );
}
