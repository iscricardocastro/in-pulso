export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Tenant = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  image_url: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  tenant_id: string;
  internal_code: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  variant: string | null;
  brand_id: string | null;
  model_id: string | null;
  category_id: string | null;
  variant_id: string | null;
  cost: number;
  sale_price: number | null;
  suggested_price: number | null;
  current_stock: number;
  minimum_stock: number;
  primary_supplier_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Pick<Supplier, "id" | "name" | "average_delivery_days"> | null;
  brand_item?: Pick<CatalogItem, "id" | "name" | "parent_id"> | null;
  model_item?: Pick<CatalogItem, "id" | "name" | "parent_id"> | null;
  category_item?: Pick<CatalogItem, "id" | "name" | "parent_id"> | null;
  variant_item?: Pick<CatalogItem, "id" | "name" | "parent_id"> | null;
};

export type Supplier = {
  id: string;
  tenant_id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  average_delivery_days: number;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogKind = "brand" | "model" | "category" | "variant" | "payment_method";

export type CatalogItem = {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  kind: CatalogKind;
  name: string;
  created_at: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  tenant_id: string;
  product_id: string;
  user_id: string;
  type: "entry" | "exit" | "adjustment";
  quantity: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  products?: Pick<Product, "name" | "internal_code" | "model" | "model_item"> | null;
  users?: { full_name: string | null; email: string } | null;
};

export type InventoryAuditStatus = "open" | "closed" | "canceled";
export type InventoryAuditUncountedPolicy = "ignore" | "zero";

export type InventoryAudit = {
  id: string;
  tenant_id: string;
  user_id: string;
  audit_number: string;
  status: InventoryAuditStatus;
  category_ids: string[];
  category_names: string[];
  notes: string | null;
  apply_inventory: boolean;
  uncounted_policy: InventoryAuditUncountedPolicy;
  total_items: number;
  counted_items: number;
  expected_pieces: number;
  counted_pieces: number;
  positive_difference: number;
  negative_difference: number;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  users?: { full_name: string | null; email: string } | null;
  items?: InventoryAuditItem[];
};

export type InventoryAuditItem = {
  id: string;
  tenant_id: string;
  audit_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  initial_stock: number;
  closing_stock: number | null;
  counted_quantity: number | null;
  difference: number;
  counted: boolean;
  created_at: string;
  updated_at: string;
  products?: Pick<Product, "id" | "name" | "internal_code" | "current_stock"> | null;
};

export type DiscountType = "amount" | "percent";
export type SaleStatus = "completed" | "with_debt" | "partially_refunded" | "refunded" | "canceled";

export type SaleItem = {
  id: string;
  tenant_id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  suggested_price: number;
  unit_price: number;
  discount_type: DiscountType | null;
  discount_value: number;
  discount_total: number;
  line_total: number;
  refunded_quantity: number;
  created_at: string;
  updated_at: string;
  products?: Pick<Product, "id" | "name" | "internal_code" | "current_stock"> | null;
};

export type SalePayment = {
  id: string;
  tenant_id: string;
  sale_id: string;
  payment_method_id: string;
  payment_method_name: string;
  amount_paid: number;
  amount_received: number;
  change_due: number;
  comments: string | null;
  created_at: string;
};

export type SaleRefundItem = {
  id: string;
  tenant_id: string;
  refund_id: string;
  sale_item_id: string;
  product_id: string;
  quantity: number;
  amount: number;
  created_at: string;
};

export type SaleRefund = {
  id: string;
  tenant_id: string;
  sale_id: string;
  user_id: string;
  payment_method_id: string;
  payment_method_name: string;
  amount: number;
  affect_inventory: boolean;
  comments: string | null;
  created_at: string;
  items?: SaleRefundItem[];
};

export type SaleEvent = {
  id: string;
  tenant_id: string;
  sale_id: string;
  user_id: string;
  type: "created" | "updated" | "canceled" | "refunded";
  note: string | null;
  metadata: Json;
  created_at: string;
  users?: { full_name: string | null; email: string } | null;
};

export type Sale = {
  id: string;
  tenant_id: string;
  user_id: string;
  customer_id: string | null;
  sale_number: string;
  status: SaleStatus;
  subtotal: number;
  discount_type: DiscountType | null;
  discount_value: number;
  discount_total: number;
  total: number;
  paid_total: number;
  balance_due: number;
  comments: string | null;
  created_at: string;
  updated_at: string;
  customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | null;
  items?: SaleItem[];
  payments?: SalePayment[];
  refunds?: SaleRefund[];
  events?: SaleEvent[];
  debt?: CustomerDebt | null;
};

export type CustomerDebt = {
  id: string;
  tenant_id: string;
  customer_id: string;
  sale_id: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  status: "open" | "paid" | "canceled";
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | null;
  sales?: Pick<Sale, "id" | "sale_number" | "total" | "paid_total" | "balance_due" | "created_at" | "status"> | null;
  payments?: DebtPayment[];
};

export type DebtPayment = {
  id: string;
  tenant_id: string;
  debt_id: string;
  user_id: string;
  payment_method_id: string;
  payment_method_name: string;
  amount: number;
  comments: string | null;
  created_at: string;
};

export type PurchaseOrderItem = {
  product_id: string;
  quantity_requested: number;
  unit_cost: number;
  received_quantity?: number;
};

export type PurchaseOrderEventType =
  | "created"
  | "payment_recorded"
  | "marked_in_transit"
  | "received_complete"
  | "received_progress"
  | "received_incomplete_closed"
  | "note_added"
  | "canceled";

export type PurchaseOrderStatus = "draft" | "quoted" | "partially_paid" | "paid" | "in_transit" | "received" | "canceled";

export type PurchaseOrderEvent = {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  user_id: string;
  type: PurchaseOrderEventType;
  from_status: PurchaseOrderStatus | null;
  to_status: PurchaseOrderStatus | null;
  amount: number | null;
  payment_method_id: string | null;
  payment_method_name: string | null;
  note: string | null;
  metadata: Json;
  created_at: string;
  users?: { full_name: string | null; email: string } | null;
};

export type PurchaseOrder = {
  id: string;
  tenant_id: string;
  order_number: string;
  supplier_id: string | null;
  supplier: string | null;
  status: PurchaseOrderStatus;
  expected_arrival: string | null;
  advance_percent: number;
  advance_paid: number;
  estimated_total: number;
  expected_items: PurchaseOrderItem[];
  received_items: PurchaseOrderItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Pick<Supplier, "id" | "name" | "average_delivery_days"> | null;
  events?: PurchaseOrderEvent[];
};

export type DashboardStats = {
  lowStock: number;
  outOfStock: number;
  needsReview: number;
  inTransitOrders: number;
  inventoryValue: number;
  expectedArrivals: number;
  weeklySales: number;
  weeklyPaid: number;
  weeklyBalanceDue: number;
  weeklySalesCount: number;
  openDebt: number;
  debtorCount: number;
  openDebtCount: number;
};
