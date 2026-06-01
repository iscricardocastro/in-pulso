import { eachDayOfInterval, endOfDay, startOfDay } from "date-fns";
import { requireUserContext } from "@/services/context";
import type { Customer, Sale, SalePayment, SaleRefund } from "@/types/database";

type ReportSale = Pick<Sale, "id" | "sale_number" | "status" | "total" | "paid_total" | "balance_due" | "created_at"> & {
  customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | null;
  payments?: SalePayment[];
  refundAmount: number;
  refundExtra: number;
  refundRetained: number;
  refundValue: number;
  refunds?: SaleRefund[];
};

type RawReportSale = Omit<ReportSale, "customers" | "refundAmount" | "refundExtra" | "refundRetained" | "refundValue"> & {
  customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | Pick<Customer, "id" | "name" | "phone" | "email">[] | null;
};

export type DailyReportRange = {
  end: string;
  endDate: string;
  start: string;
  startDate: string;
};

export async function getDailySalesReport(params: { end?: string; start?: string }) {
  const { supabase } = await requireUserContext();
  const range = getReportRange(params);

  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, status, total, paid_total, balance_due, created_at, customers(id, name, phone, email), payments:sale_payments(*), refunds:sale_refunds(*, items:sale_refund_items(*))")
    .gte("created_at", range.start)
    .lte("created_at", range.end)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const sales = ((data ?? []) as unknown as RawReportSale[])
    .map((sale) => ({
      ...sale,
      customers: Array.isArray(sale.customers) ? (sale.customers[0] ?? null) : (sale.customers ?? null),
      ...summarizeSaleRefunds(sale.refunds ?? []),
    }))
    .filter((sale) => sale.status !== "canceled");
  const payments = sales.flatMap((sale) => sale.payments ?? []);
  const paidSales = sales.filter((sale) => Number(sale.balance_due ?? 0) <= 0);
  const pendingSales = sales.filter((sale) => Number(sale.balance_due ?? 0) > 0);
  const grossTotal = sum(sales, "total");
  const refundValue = sum(sales, "refundValue");
  const refundAmount = sum(sales, "refundAmount");
  const refundRetained = sum(sales, "refundRetained");
  const refundExtra = sum(sales, "refundExtra");
  const total = sumNetSales(sales);
  const paid = sumNetPaid(sales);
  const pending = sum(sales, "balance_due");
  const refunds = sales.flatMap((sale) => sale.refunds ?? []);
  const paymentTotal = paid;
  const averageTicket = sales.length > 0 ? total / sales.length : 0;

  const salesByDay = eachDayOfInterval({
    start: new Date(range.start),
    end: new Date(range.end),
  }).map((day) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const daySales = sales.filter((sale) => {
      const time = new Date(sale.created_at).getTime();
      return time >= dayStart && time <= dayEnd;
    });

    return {
      count: daySales.length,
      date: toInputDate(day),
      label: new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(day),
      paid: sumNetPaid(daySales),
      pending: sum(daySales, "balance_due"),
      refundAmount: sum(daySales, "refundAmount"),
      refundRetained: sum(daySales, "refundRetained"),
      total: sumNetSales(daySales),
    };
  });

  const paymentMethods = Array.from(groupPayments(payments, refunds).values()).sort((a, b) => b.total - a.total);
  const refundedSales = sales.filter((sale) => sale.refundAmount > 0);
  const topPending = pendingSales.sort((a, b) => Number(b.balance_due ?? 0) - Number(a.balance_due ?? 0)).slice(0, 6);
  const recentSales = sales.slice(0, 8);

  return {
    averageTicket,
    grossTotal,
    paid,
    paidCount: paidSales.length,
    paymentMethods,
    paymentTotal,
    pending,
    pendingCount: pendingSales.length,
    range,
    refundedSales: refundedSales.slice(0, 6),
    recentSales,
    refundAmount,
    refundExtra,
    refundRetained,
    refundValue,
    salesByDay,
    salesCount: sales.length,
    topPending,
    total,
  };
}

function getReportRange(params: { end?: string; start?: string }): DailyReportRange {
  const today = startOfDay(new Date());
  const startDate = parseInputDate(params.start) ?? today;
  const endDate = parseInputDate(params.end) ?? startDate;
  const orderedStart = startDate <= endDate ? startDate : endDate;
  const orderedEnd = startDate <= endDate ? endDate : startDate;

  return {
    end: endOfDay(orderedEnd).toISOString(),
    endDate: toInputDate(orderedEnd),
    start: startOfDay(orderedStart).toISOString(),
    startDate: toInputDate(orderedStart),
  };
}

function summarizeSaleRefunds(refunds: SaleRefund[]) {
  const refundValue = refunds.reduce(
    (total, refund) => total + (refund.items ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    0,
  );
  const refundAmount = refunds.reduce((total, refund) => total + Number(refund.amount ?? 0), 0);
  const difference = refundValue - refundAmount;

  return {
    refundAmount,
    refundExtra: Math.max(0, -difference),
    refundRetained: Math.max(0, difference),
    refundValue,
  };
}

function groupPayments(payments: SalePayment[], refunds: SaleRefund[]) {
  const grouped = new Map<string, { count: number; id: string; name: string; refundCount: number; refunded: number; total: number }>();

  for (const payment of payments) {
    const key = payment.payment_method_id;
    const current = grouped.get(key) ?? {
      count: 0,
      id: key,
      name: payment.payment_method_name,
      refundCount: 0,
      refunded: 0,
      total: 0,
    };

    current.count += 1;
    current.total += Number(payment.amount_paid ?? 0);
    grouped.set(key, current);
  }

  for (const refund of refunds) {
    const key = refund.payment_method_id;
    const current = grouped.get(key) ?? {
      count: 0,
      id: key,
      name: refund.payment_method_name,
      refundCount: 0,
      refunded: 0,
      total: 0,
    };

    const amount = Number(refund.amount ?? 0);
    current.refundCount += 1;
    current.refunded += amount;
    current.total -= amount;
    grouped.set(key, current);
  }

  return grouped;
}

function parseInputDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function sum<T extends Record<K, number>, K extends keyof T>(items: T[], key: K) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

function sumNetPaid(sales: ReportSale[]) {
  return sales.reduce((total, sale) => total + Math.max(0, Number(sale.paid_total ?? 0) - sale.refundAmount), 0);
}

function sumNetSales(sales: ReportSale[]) {
  return sales.reduce((total, sale) => total + Math.max(0, Number(sale.total ?? 0) - sale.refundAmount), 0);
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
