"use server";

import { revalidatePath } from "next/cache";
import { debtPaymentSchema } from "@/features/debtors/schemas";
import { requireUserContext } from "@/services/context";
import type { CatalogItem, Customer, CustomerDebt, DebtPayment, Sale } from "@/types/database";

export type DebtorSummary = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  total_balance: number;
  debts: CustomerDebt[];
};

export async function getDebtors() {
  const { supabase } = await requireUserContext();
  const { data: debts, error } = await supabase
    .from("customer_debts")
    .select("*")
    .in("status", ["open"])
    .gt("balance", 0)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const saleIds = (debts ?? []).map((debt) => debt.sale_id);
  const debtIds = (debts ?? []).map((debt) => debt.id);
  const customerIds = Array.from(new Set((debts ?? []).map((debt) => debt.customer_id)));
  const salesById = new Map<string, Sale>();
  const paymentsByDebt = new Map<string, DebtPayment[]>();
  const customersById = new Map<string, Customer>();

  if (customerIds.length > 0) {
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, phone, email")
      .in("id", customerIds);
    if (customersError) throw new Error(customersError.message);
    (customers ?? []).forEach((customer) => customersById.set(customer.id, customer as Customer));
  }

  if (saleIds.length > 0) {
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("id, sale_number, total, paid_total, balance_due, created_at, status")
      .in("id", saleIds);
    if (salesError) throw new Error(salesError.message);
    (sales ?? []).forEach((sale) => salesById.set(sale.id, sale as Sale));
  }

  if (debtIds.length > 0) {
    const { data: payments, error: paymentsError } = await supabase
      .from("debt_payments")
      .select("*")
      .in("debt_id", debtIds)
      .order("created_at", { ascending: false });
    if (paymentsError) throw new Error(paymentsError.message);
    (payments ?? []).forEach((payment) => {
      const current = paymentsByDebt.get(payment.debt_id) ?? [];
      current.push(payment as DebtPayment);
      paymentsByDebt.set(payment.debt_id, current);
    });
  }

  const grouped = new Map<string, DebtorSummary>();
  for (const raw of debts ?? []) {
    const debt = {
      ...raw,
      sales: salesById.get(raw.sale_id) ?? null,
      payments: paymentsByDebt.get(raw.id) ?? [],
    } as CustomerDebt;
    const customer = customersById.get(raw.customer_id);
    const existing: DebtorSummary = grouped.get(raw.customer_id) ?? {
      customer_id: raw.customer_id,
      customer_name: customer?.name ?? "Cliente",
      phone: customer?.phone ?? null,
      email: customer?.email ?? null,
      total_balance: 0,
      debts: [],
    };
    existing.total_balance += Number(raw.balance ?? 0);
    existing.debts.push(debt);
    grouped.set(raw.customer_id, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => b.total_balance - a.total_balance);
}

export async function recordDebtPayment(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = debtPaymentSchema.parse(input);

  const { data: debt, error: debtError } = await supabase
    .from("customer_debts")
    .select("*")
    .eq("id", values.debt_id)
    .single();
  if (debtError) throw new Error(debtError.message);
  if (debt.status !== "open" || Number(debt.balance) <= 0) throw new Error("Deuda cerrada");
  if (values.amount > Number(debt.balance)) throw new Error("Abono excede saldo");
  const { data: sale, error: saleLookupError } = await supabase
    .from("sales")
    .select("id, sale_number, paid_total, balance_due")
    .eq("id", debt.sale_id)
    .single();
  if (saleLookupError) throw new Error(saleLookupError.message);

  const { data: method, error: methodError } = await supabase
    .from("catalog_items")
    .select("id, name, kind")
    .eq("id", values.payment_method_id)
    .eq("kind", "payment_method")
    .single();
  if (methodError) throw new Error("Metodo de pago invalido");

  const nextPaid = Number(debt.paid_amount) + values.amount;
  const nextBalance = Math.max(0, Number(debt.balance) - values.amount);
  const nextStatus = nextBalance <= 0 ? "paid" : "open";

  const { error: paymentError } = await supabase.from("debt_payments").insert({
    tenant_id: profile.tenant_id,
    debt_id: values.debt_id,
    user_id: profile.id,
    payment_method_id: method.id,
    payment_method_name: method.name,
    amount: values.amount,
    comments: values.comments || null,
  });
  if (paymentError) throw new Error(paymentError.message);

  const { error: updateDebtError } = await supabase
    .from("customer_debts")
    .update({ paid_amount: nextPaid, balance: nextBalance, status: nextStatus })
    .eq("id", values.debt_id);
  if (updateDebtError) throw new Error(updateDebtError.message);

  const salePaid = Number(sale.paid_total ?? 0) + values.amount;
  const saleBalance = Math.max(0, Number(sale.balance_due ?? 0) - values.amount);
  const { error: saleError } = await supabase
    .from("sales")
    .update({
      paid_total: salePaid,
      balance_due: saleBalance,
      status: saleBalance <= 0 ? "completed" : "with_debt",
    })
    .eq("id", debt.sale_id);
  if (saleError) throw new Error(saleError.message);

  const { error: salePaymentError } = await supabase.from("sale_payments").insert({
    tenant_id: profile.tenant_id,
    sale_id: debt.sale_id,
    payment_method_id: method.id,
    payment_method_name: method.name,
    amount_paid: values.amount,
    amount_received: values.amount,
    change_due: 0,
    comments: values.comments || "Abono a deuda",
  });
  if (salePaymentError) throw new Error(salePaymentError.message);

  revalidatePath("/debtors");
  revalidatePath("/sales");
}

export async function createDebtPaymentMethod(name: string) {
  const { supabase, profile } = await requireUserContext();
  const clean = name.trim();
  if (!clean) throw new Error("Nombre requerido");
  const { data, error } = await supabase
    .from("catalog_items")
    .insert({ tenant_id: profile.tenant_id, kind: "payment_method", name: clean })
    .select("*")
    .single();
  if (error?.code === "23505") {
    const { data: existing, error: existingError } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("kind", "payment_method")
      .eq("name", clean)
      .single();
    if (existingError) throw new Error(existingError.message);
    return existing as CatalogItem;
  }
  if (error) throw new Error(error.message);
  revalidatePath("/catalogs");
  return data as CatalogItem;
}
