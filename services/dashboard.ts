import { addDays, startOfDay } from "date-fns";
import { requireUserContext } from "@/services/context";
import type { DashboardStats, Product, PurchaseOrder } from "@/types/database";

export async function getDashboardData() {
  const { supabase } = await requireUserContext();

  const [productsResult, movementsResult, ordersResult] = await Promise.all([
    supabase
      .from("products")
      .select(`
        *,
        brand_item:catalog_items!products_brand_id_fkey(id, name, parent_id),
        model_item:catalog_items!products_model_id_fkey(id, name, parent_id),
        category_item:catalog_items!products_category_id_fkey(id, name, parent_id),
        variant_item:catalog_items!products_variant_id_fkey(id, name, parent_id)
      `)
      .order("current_stock", { ascending: true }),
    supabase
      .from("inventory_movements")
      .select("*, products(name, internal_code, model, model_item:catalog_items!products_model_id_fkey(id, name, parent_id)), users(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("purchase_orders")
      .select("*")
      .in("status", ["paid", "in_transit"])
      .order("expected_arrival", { ascending: true }),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (movementsResult.error) throw new Error(movementsResult.error.message);
  if (ordersResult.error) throw new Error(ordersResult.error.message);

  const products = (productsResult.data ?? []) as Product[];
  const orders = (ordersResult.data ?? []) as PurchaseOrder[];
  const today = startOfDay(new Date());
  const soon = addDays(today, 7);
  const lowStockProducts = products.filter((product) => product.minimum_stock > 0 && product.current_stock <= product.minimum_stock);
  const outOfStockProducts = products.filter((product) => product.current_stock === 0);
  const needsReview = products.filter((product) => product.current_stock === 0 || (product.minimum_stock > 0 && product.current_stock <= product.minimum_stock));

  const stats: DashboardStats = {
    lowStock: lowStockProducts.length,
    outOfStock: outOfStockProducts.length,
    needsReview: needsReview.length,
    inTransitOrders: orders.length,
    inventoryValue: products.reduce((total, product) => total + product.cost * product.current_stock, 0),
    expectedArrivals: orders.filter((order) => {
      if (!order.expected_arrival) return false;
      const arrival = startOfDay(new Date(order.expected_arrival));
      return arrival >= today && arrival <= soon;
    }).length,
  };

  const highMovement = products
    .slice()
    .sort((a, b) => b.minimum_stock - a.minimum_stock)
    .slice(0, 5);

  return {
    stats,
    lowStockProducts: lowStockProducts.slice(0, 8),
    movements: movementsResult.data ?? [],
    highMovement,
    upcomingOrders: orders.slice(0, 6),
  };
}
