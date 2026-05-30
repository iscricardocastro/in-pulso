export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
};
