"use client";

import { Check, ChevronsUpDown, Printer, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Select } from "@/components/ui/select";
import { Barcode } from "@/features/labels/barcode";
import { productBrand, productModel } from "@/lib/catalog-display";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/database";

export function LabelsView({ products }: { products: Product[] }) {
  const [mode, setMode] = useState<"qr" | "barcode">("qr");
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [printCopies, setPrintCopies] = useState("1");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const visibleProducts = useMemo(() => {
    if (selectedProductIds.length === 0) return products;
    const selected = new Set(selectedProductIds);
    return products.filter((product) => selected.has(product.id));
  }, [products, selectedProductIds]);

  useEffect(() => {
    function resetPrintSelection() {
      document.body.classList.remove("is-printing-copies");
      setPrintProduct(null);
    }

    window.addEventListener("afterprint", resetPrintSelection);
    return () => window.removeEventListener("afterprint", resetPrintSelection);
  }, []);

  function printBatch() {
    document.body.classList.remove("is-printing-copies");
    window.print();
  }

  function openPrintDialog(product: Product) {
    setPrintProduct(product);
    setPrintCopies(String(product.current_stock > 0 ? product.current_stock : 1));
  }

  function printSingleCopies() {
    const copies = Math.max(1, Number(printCopies) || 1);
    setPrintCopies(String(copies));
    document.body.classList.add("is-printing-copies");
    window.setTimeout(() => window.print(), 50);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>
          <p className="text-sm text-muted-foreground">Imprime QR o codigo de barras con nombre, codigo y modelo.</p>
        </div>
        <div className="flex flex-col gap-2 no-print sm:flex-row">
          <ProductMultiSelect products={products} selectedIds={selectedProductIds} onChange={setSelectedProductIds} />
          <Select className="w-40" value={mode} onChange={(event) => setMode(event.target.value as "qr" | "barcode")}>
            <option value="qr">QR</option>
            <option value="barcode">Codigo barras</option>
          </Select>
          <Button type="button" onClick={printBatch}>
            <Printer className="h-4 w-4" />
            Imprimir lote
          </Button>
        </div>
      </div>

      <div className="print-area grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleProducts.map((product) => (
          <LabelCard key={product.id} product={product} mode={mode}>
            <Button className="w-full no-print" type="button" variant="outline" onClick={() => openPrintDialog(product)}>
              <QrCode className="h-4 w-4" />
              Imprimir individual
            </Button>
          </LabelCard>
        ))}
      </div>

      <div className="print-copies-area print-area">
        {printProduct
          ? Array.from({ length: Math.max(1, Number(printCopies) || 1) }, (_, index) => (
            <LabelCard key={`${printProduct.id}-${index}`} product={printProduct} mode={mode} />
          ))
          : null}
      </div>

      {printProduct ? (
        <ModalOverlay className="no-print">
          <div className="animate-pop w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Imprimir etiqueta</h2>
              <p className="text-sm text-muted-foreground">{printProduct.name}</p>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium" htmlFor="label-copies">
                Cantidad
              </label>
              <Input
                id="label-copies"
                min={1}
                type="number"
                value={printCopies}
                onChange={(event) => setPrintCopies(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Stock actual: {printProduct.current_stock}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPrintProduct(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={printSingleCopies}>
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
}

function ProductMultiSelect({
  products,
  selectedIds,
  onChange,
}: {
  products: Product[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.internal_code, productModel(product), productBrand(product)].some((value) =>
        String(value || "").toLowerCase().includes(term),
      ),
    );
  }, [products, search]);
  const selectedProducts = products.filter((product) => selected.has(product.id));
  const label = selectedIds.length === 0 ? "Todas" : `${selectedIds.length} seleccionadas`;

  function toggleProduct(productId: string) {
    onChange(selected.has(productId) ? selectedIds.filter((id) => id !== productId) : [...selectedIds, productId]);
  }

  return (
    <div
      className="relative w-full sm:w-80"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="motion-press flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors duration-200 hover:bg-accent focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
        type="button"
        onClick={() => {
          setSearch("");
          setOpen((current) => !current);
        }}
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronsUpDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {selectedProducts.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedProducts.map((product) => (
            <button
              key={product.id}
              className="motion-press inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              type="button"
              onClick={() => toggleProduct(product.id)}
            >
              <span className="truncate">{product.internal_code}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-xl shadow-slate-950/10 ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
          <div className="border-b border-slate-200 p-2 dark:border-slate-800">
            <Input autoFocus placeholder="Buscar producto" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="max-h-72 overflow-auto p-1.5" role="listbox" aria-multiselectable="true">
            <ProductOption active={selectedIds.length === 0} label="Todas" onClick={() => onChange([])} />
            {filtered.map((product) => (
              <ProductOption
                active={selected.has(product.id)}
                key={product.id}
                label={`${product.internal_code} · ${product.name}`}
                detail={productModel(product) || undefined}
                onClick={() => toggleProduct(product.id)}
              />
            ))}
            {filtered.length === 0 ? (
              <div className="rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                Sin resultados
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductOption({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-slate-900 dark:focus-visible:bg-slate-900",
        active && "bg-blue-50 font-medium text-blue-700 hover:bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/40",
      )}
      role="option"
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {detail ? <span className="block truncate text-xs font-normal text-muted-foreground">{detail}</span> : null}
      </span>
      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
}

function LabelCard({ product, mode, children }: { product: Product; mode: "qr" | "barcode"; children?: ReactNode }) {
  return (
    <Card className="label-card break-inside-avoid">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold leading-tight">{product.name}</p>
            <p className="text-sm text-muted-foreground">{productModel(product) || "Sin modelo"}</p>
          </div>
          <Badge>{product.internal_code}</Badge>
        </div>
        <div className="flex h-28 items-center justify-center rounded-xl border border-border/70 bg-white p-3 text-black shadow-inner">
          {mode === "qr" ? <QRCodeSVG value={product.internal_code} size={88} /> : <Barcode value={product.internal_code} />}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
