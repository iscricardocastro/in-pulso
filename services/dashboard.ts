import { addDays, eachDayOfInterval, endOfWeek, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { requireUserContext } from "@/services/context";
import type { Customer, CustomerDebt, DashboardStats, Product, PurchaseOrder, SaleStatus } from "@/types/database";

type DashboardDebtor = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  total_balance: number;
  debt_count: number;
  last_debt_at: string;
};

type DashboardSale = {
  id: string;
  customer_id: string | null;
  sale_number: string;
  status: SaleStatus;
  total: number;
  paid_total: number;
  balance_due: number;
  created_at: string;
  customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | null;
};

export async function getDashboardData() {
  const { supabase } = await requireUserContext();
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const [productsResult, movementsResult, ordersResult, salesResult, debtsResult] = await Promise.all([
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
    supabase
      .from("sales")
      .select("id, customer_id, sale_number, status, total, paid_total, balance_due, created_at")
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_debts")
      .select("*")
      .eq("status", "open")
      .gt("balance", 0)
      .order("created_at", { ascending: false }),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (movementsResult.error) throw new Error(movementsResult.error.message);
  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (salesResult.error) throw new Error(salesResult.error.message);
  if (debtsResult.error) throw new Error(debtsResult.error.message);

  const products = (productsResult.data ?? []) as Product[];
  const orders = (ordersResult.data ?? []) as PurchaseOrder[];
  const rawSales = (salesResult.data ?? []) as DashboardSale[];
  const visibleSales = rawSales.filter((sale) => sale.status !== "canceled" && sale.status !== "refunded");
  const debts = (debtsResult.data ?? []) as CustomerDebt[];
  const customerIds = Array.from(
    new Set([
      ...visibleSales.map((sale) => sale.customer_id).filter(Boolean),
      ...debts.map((debt) => debt.customer_id),
    ]),
  ) as string[];
  const customersById = await getCustomersById(customerIds);
  const sales = visibleSales.map((sale) => ({
    ...sale,
    customers: sale.customer_id ? (customersById.get(sale.customer_id) ?? null) : null,
  }));
  const debtsWithCustomers = debts.map((debt) => ({
    ...debt,
    customers: customersById.get(debt.customer_id) ?? null,
  }));
  const soon = addDays(today, 7);
  const lowStockProducts = products.filter((product) => product.minimum_stock > 0 && product.current_stock <= product.minimum_stock);
  const outOfStockProducts = products.filter((product) => product.current_stock === 0);
  const needsReview = products.filter((product) => product.current_stock === 0 || (product.minimum_stock > 0 && product.current_stock <= product.minimum_stock));
  const debtors = summarizeDebtors(debtsWithCustomers);
  const weeklyDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
    const daySales = sales.filter((sale) => isSameDay(new Date(sale.created_at), day));
    return {
      date: day.toISOString(),
      label: new Intl.DateTimeFormat("es-MX", { weekday: "short" }).format(day),
      total: daySales.reduce((total, sale) => total + Number(sale.total ?? 0), 0),
      count: daySales.length,
    };
  });

  const stats: DashboardStats = {
    lowStock: lowStockProducts.length,
    outOfStock: outOfStockProducts.length,
    needsReview: needsReview.length,
    inTransitOrders: orders.length,
    inventoryValue: products.reduce((total, product) => total + product.cost * product.current_stock, 0),
    weeklySales: sales.reduce((total, sale) => total + Number(sale.total ?? 0), 0),
    weeklyPaid: sales.reduce((total, sale) => total + Number(sale.paid_total ?? 0), 0),
    weeklyBalanceDue: sales.reduce((total, sale) => total + Number(sale.balance_due ?? 0), 0),
    weeklySalesCount: sales.length,
    openDebt: debts.reduce((total, debt) => total + Number(debt.balance ?? 0), 0),
    debtorCount: debtors.length,
    openDebtCount: debts.length,
    expectedArrivals: orders.filter((order) => {
      if (!order.expected_arrival) return false;
      const arrival = startOfDay(new Date(order.expected_arrival));
      return arrival >= today && arrival <= soon;
    }).length,
  };

  return {
    stats,
    weekRange: {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
    },
    weeklySales: sales.slice(0, 6),
    weeklySalesByDay: weeklyDays,
    debtors: debtors.slice(0, 6),
    lowStockProducts: lowStockProducts.slice(0, 8),
    movements: movementsResult.data ?? [],
    upcomingOrders: orders.slice(0, 6),
  };
}

async function getCustomersById(ids: string[]) {
  if (ids.length === 0) return new Map<string, Pick<Customer, "id" | "name" | "phone" | "email">>();

  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email")
    .in("id", ids);
  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((customer) => [customer.id, customer as Pick<Customer, "id" | "name" | "phone" | "email">]));
}

function summarizeDebtors(debts: (CustomerDebt & { customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | null })[]) {
  const grouped = new Map<string, DashboardDebtor>();

  for (const debt of debts) {
    const existing = grouped.get(debt.customer_id);
    const nextBalance = Number(debt.balance ?? 0);

    if (existing) {
      existing.total_balance += nextBalance;
      existing.debt_count += 1;
      if (new Date(debt.created_at) > new Date(existing.last_debt_at)) existing.last_debt_at = debt.created_at;
      continue;
    }

    grouped.set(debt.customer_id, {
      customer_id: debt.customer_id,
      customer_name: debt.customers?.name ?? "Cliente",
      phone: debt.customers?.phone ?? null,
      total_balance: nextBalance,
      debt_count: 1,
      last_debt_at: debt.created_at,
    });
  }

  return Array.from(grouped.values()).sort((a, b) => b.total_balance - a.total_balance);
}
