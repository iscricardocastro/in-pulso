"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit, PackagePlus, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductForm } from "@/features/products/product-form";
import { useAppStore } from "@/hooks/use-app-store";
import { useFormReveal } from "@/hooks/use-form-reveal";
import { productBrand, productCategory, productModel } from "@/lib/catalog-display";
import { money } from "@/lib/utils";
import { deleteProduct } from "@/services/products";
import type { CatalogItem, Product, Supplier } from "@/types/database";

export function ProductsTable({
  products,
  suppliers,
  catalogs,
  stockFilter,
}: {
  products: Product[];
  suppliers: Supplier[];
  catalogs: CatalogItem[];
  stockFilter?: string;
}) {
  const query = useAppStore((state) => state.query);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(products.length === 0);
  const { formRef, revealForm } = useFormReveal<HTMLDivElement>();
  const formOpen = showCreate || Boolean(editing);
  const activeStockFilter = stockFilter === "low" || stockFilter === "out" ? stockFilter : null;
  const stockFilterLabel = activeStockFilter === "low" ? "Stock bajo" : activeStockFilter === "out" ? "Agotados" : null;
  const emptyStockTitle = activeStockFilter === "low" ? "Sin productos con stock bajo" : "Sin productos agotados";
  const handleEditProduct = useCallback((product: Product) => {
    setShowCreate(false);
    setEditing(product);
    revealForm();
  }, [revealForm]);
  const handleDeleteProduct = useCallback(async (product: Product) => {
    try {
      await deleteProduct(product.id);
      toast.success("Producto eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
      throw error;
    }
  }, []);
  const handleToggleForm = useCallback(() => {
    if (formOpen) {
      setEditing(null);
      setShowCreate(false);
      return;
    }
    setShowCreate(true);
    revealForm();
  }, [formOpen, revealForm]);
  const filteredProducts = useMemo(() => {
    if (activeStockFilter === "low") {
      return products.filter((product) => product.minimum_stock > 0 && product.current_stock <= product.minimum_stock);
    }
    if (activeStockFilter === "out") {
      return products.filter((product) => product.current_stock === 0);
    }
    return products;
  }, [activeStockFilter, products]);

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "internal_code",
        header: "Codigo",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.internal_code}</span>,
      },
      {
        accessorKey: "name",
        header: "Producto",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{productModel(row.original) || "Sin modelo"}</p>
          </div>
        ),
      },
      {
        id: "brand",
        header: "Marca",
        accessorFn: (row) => productBrand(row),
      },
      {
        id: "category",
        header: "Categoria",
        accessorFn: (row) => productCategory(row),
      },
      {
        accessorKey: "supplier",
        header: "Proveedor",
        cell: ({ row }) => row.original.suppliers?.name || "Sin proveedor",
        sortingFn: (a, b) =>
          (a.original.suppliers?.name || "").localeCompare(b.original.suppliers?.name || ""),
      },
      {
        accessorKey: "current_stock",
        header: "Stock",
        cell: ({ row }) => {
          const low = row.original.current_stock <= row.original.minimum_stock;
          return (
            <Badge variant={row.original.current_stock === 0 ? "destructive" : low ? "warning" : "success"}>
              {row.original.current_stock} / {row.original.minimum_stock}
            </Badge>
          );
        },
      },
      {
        accessorKey: "cost",
        header: "Costo",
        cell: ({ row }) => money(row.original.cost),
      },
      {
        id: "actions",
        enableSorting: false,
        meta: { headerClassName: "text-right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => handleEditProduct(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDeleteButton
              title="Eliminar producto"
              description={`Seguro que quieres eliminar "${row.original.name}"? Esta accion no se puede deshacer.`}
              onConfirm={() => handleDeleteProduct(row.original)}
            />
          </div>
        ),
      },
    ],
    [handleDeleteProduct, handleEditProduct],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            {stockFilterLabel ? `${stockFilterLabel}: ${filteredProducts.length} piezas.` : "Catalogo con stock, minimo y costo real."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {activeStockFilter ? (
            <Button asChild variant="outline">
              <Link href="/products">
                <X className="h-4 w-4" />
                Quitar filtro
              </Link>
            </Button>
          ) : null}
          {activeStockFilter === "low" ? (
            <Button asChild>
              <Link href="/purchase-orders?create=low-stock">
                <ShoppingCart className="h-4 w-4" />
                Crear pedido
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant={formOpen ? "secondary" : "default"}
            onClick={handleToggleForm}
          >
            {formOpen ? <X className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
            {formOpen ? "Cerrar" : "Nuevo producto"}
          </Button>
        </div>
      </div>

      {showCreate ? (
        <Card ref={formRef} className="motion-surface scroll-mt-24">
          <CardHeader>
            <CardTitle>Crear producto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm
              key="create-product"
              catalogs={catalogs}
              suppliers={suppliers}
              onCancel={() => setShowCreate(false)}
              onSaved={() => setShowCreate(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <Card ref={formRef} className="motion-surface scroll-mt-24">
          <CardHeader>
            <CardTitle>Editar producto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm
              key={editing.id}
              product={editing}
              catalogs={catalogs}
              suppliers={suppliers}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={filteredProducts}
        emptyState={
          <EmptyState
            icon={PackagePlus}
            title={stockFilterLabel ? emptyStockTitle : "Sin productos"}
            description={stockFilterLabel ? "No hay piezas que coincidan con este filtro." : "Crea o importa piezas para empezar a controlar minimos."}
          />
        }
        globalFilter={query}
        noResultsText={stockFilterLabel ? `Sin resultados dentro de ${stockFilterLabel.toLowerCase()}.` : undefined}
      />
    </div>
  );
}
