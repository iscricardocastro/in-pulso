"use client";

import { Ban, Check, ClipboardCheck, Eye, ListChecks, Minus, Plus, Printer, Save, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FloatingListbox } from "@/components/ui/floating-listbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import {
  cancelInventoryAudit,
  closeInventoryAudit,
  countInventoryAuditItem,
  createInventoryAudit,
  getInventoryAuditByNumber,
} from "@/services/inventory-audits";
import type { CountInventoryAuditItemResult } from "@/services/inventory-audits";
import type { CatalogItem, InventoryAudit, InventoryAuditItem } from "@/types/database";

type ReceiptContext = {
  company: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    email: string;
    full_name: string | null;
  };
};

type CloseOptions = {
  applyInventory: boolean;
  uncountedPolicy: "ignore" | "zero";
};

export function InventoryAuditsView({
  audits,
  catalogs,
  openAudits,
  receiptContext,
}: {
  audits: InventoryAudit[];
  catalogs: CatalogItem[];
  openAudits: InventoryAudit[];
  receiptContext: ReceiptContext;
}) {
  const router = useRouter();
  const categories = catalogs.filter((item) => item.kind === "category");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [scanQuantity, setScanQuantity] = useState("1");
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelAudit, setCancelAudit] = useState<InventoryAudit | null>(null);
  const [detailAudit, setDetailAudit] = useState<InventoryAudit | null>(null);
  const [printAudit, setPrintAudit] = useState<InventoryAudit | null>(null);
  const [localAudit, setLocalAudit] = useState<InventoryAudit | null>(null);
  const [closedAuditId, setClosedAuditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const selectedOpenAudit = openAudits.find((audit) => audit.id === selectedAuditId) ?? null;
  const workingAudit = closedAuditId === selectedAuditId ? null : localAudit?.id === selectedAuditId ? localAudit : selectedOpenAudit;
  const reservedCategoryIds = useMemo(
    () => new Set(openAudits.flatMap((audit) => audit.category_ids)),
    [openAudits],
  );

  const sortedItems = useMemo(
    () => [...(workingAudit?.items ?? [])].sort((a, b) => `${a.category ?? ""}${a.product_name}`.localeCompare(`${b.category ?? ""}${b.product_name}`)),
    [workingAudit],
  );
  const filteredItems = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return sortedItems;
    return sortedItems.filter((item) => itemMatchesQuery(item, clean));
  }, [query, sortedItems]);
  const groupedItems = useMemo(() => groupItemsByCategory(filteredItems), [filteredItems]);
  const summary = useMemo(() => summarizeItems(workingAudit?.items ?? []), [workingAudit]);
  const stockChanged = useMemo(
    () => (workingAudit?.items ?? []).some((item) => item.products && item.products.current_stock !== item.initial_stock),
    [workingAudit],
  );

  useEffect(() => {
    if (!workingAudit) return;
    inputRef.current?.focus();
  }, [workingAudit]);

  useEffect(() => {
    if (!printAudit) return;
    document.body.classList.add("is-printing-receipt");
    const timer = window.setTimeout(() => window.print(), 150);
    const handleAfterPrint = () => {
      document.body.classList.remove("is-printing-receipt");
      setPrintAudit(null);
    };

    window.addEventListener("afterprint", handleAfterPrint, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("is-printing-receipt");
    };
  }, [printAudit]);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) => (
      current.includes(id) ? current.filter((categoryId) => categoryId !== id) : [...current, id]
    ));
  }

  function startAudit() {
    startTransition(async () => {
      try {
        const auditNumber = await createInventoryAudit({ category_ids: selectedCategoryIds, notes });
        const audit = await getInventoryAuditByNumber(auditNumber);
        setSelectedCategoryIds([]);
        setNotes("");
        setClosedAuditId(null);
        setLocalAudit(audit);
        setSelectedAuditId(audit.id);
        saveQueueRef.current = Promise.resolve();
        toast.success("Conteo abierto");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo abrir conteo");
      }
    });
  }

  function leavePending() {
    if (!workingAudit) return;
    startTransition(async () => {
      try {
        await saveQueueRef.current;
        setCloseOpen(false);
        setLocalAudit(null);
        setSelectedAuditId(null);
        setQuery("");
        saveQueueRef.current = Promise.resolve();
        toast.success("Avance guardado");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar avance");
      }
    });
  }

  function countItem(item: InventoryAuditItem, mode: "add" | "set", quantity: number) {
    if (!workingAudit) return;
    const auditId = workingAudit.id;
    const previous = {
      counted: item.counted,
      counted_quantity: item.counted_quantity,
      difference: item.difference,
    };
    const optimisticItem = getOptimisticCountItem(item, mode, quantity);

    setLocalAudit((current) => updateAuditItem(current?.id === auditId ? current : workingAudit, optimisticItem));
    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 50);

    const saveOperation = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const result = await countInventoryAuditItem({
          audit_id: auditId,
          item_id: item.id,
          mode,
          quantity,
        });
        setLocalAudit((current) => mergeCountResult(current?.id === auditId ? current : workingAudit, result));
      })
      .catch((error) => {
        setLocalAudit((current) => updateAuditItem(current?.id === auditId ? current : workingAudit, { ...item, ...previous }));
        toast.error(error instanceof Error ? error.message : "No se pudo contar producto");
      });

    saveQueueRef.current = saveOperation;
  }

  function handleScanSubmit() {
    if (!workingAudit) return;
    const clean = query.trim().toLowerCase();
    if (!clean) return;
    const exact = sortedItems.find((item) => item.product_code.toLowerCase() === clean);
    const match = exact ?? sortedItems.find((item) => itemMatchesQuery(item, clean));
    if (!match) {
      toast.error("Producto no encontrado en este conteo");
      return;
    }
    countItem(match, "add", Math.max(1, Number(scanQuantity) || 1));
  }

  function submitClose(options: CloseOptions) {
    if (!workingAudit) return;
    startTransition(async () => {
      try {
        await saveQueueRef.current;
        const auditNumber = await closeInventoryAudit({
          audit_id: workingAudit.id,
          apply_inventory: options.applyInventory,
          uncounted_policy: options.uncountedPolicy,
        });
        const audit = await getInventoryAuditByNumber(auditNumber);
        setCloseOpen(false);
        setClosedAuditId(workingAudit.id);
        setLocalAudit(null);
        setSelectedAuditId(null);
        setPrintAudit(audit);
        toast.success(options.applyInventory ? "Conteo cerrado e inventario actualizado" : "Conteo cerrado sin actualizar inventario");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cerrar conteo");
      }
    });
  }

  function submitCancel(audit: InventoryAudit) {
    startTransition(async () => {
      try {
        if (workingAudit?.id === audit.id) await saveQueueRef.current;
        await cancelInventoryAudit({ audit_id: audit.id });
        setCancelAudit(null);
        if (workingAudit?.id === audit.id) {
          setClosedAuditId(audit.id);
          setLocalAudit(null);
          setSelectedAuditId(null);
          setQuery("");
        }
        toast.success("Inventario cancelado");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cancelar inventario");
      }
    });
  }

  function reprint(auditNumber: string) {
    startTransition(async () => {
      try {
        setPrintAudit(await getInventoryAuditByNumber(auditNumber));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo imprimir ticket");
      }
    });
  }

  function showDetail(auditNumber: string) {
    startTransition(async () => {
      try {
        setDetailAudit(await getInventoryAuditByNumber(auditNumber));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar detalle");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conteo de inventario</h1>
          <p className="text-sm text-muted-foreground">Auditorias simultaneas por categoria, escaneo y ticket.</p>
        </div>
      </div>

      {workingAudit ? (
        <Card className="motion-surface">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{workingAudit.audit_number}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{workingAudit.category_names.join(", ")}</p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  <Button disabled={pending} type="button" variant="destructive" onClick={() => setCancelAudit(workingAudit)}>
                    <Ban className="h-4 w-4" />
                    Cancelar inventario
                  </Button>
                  <Button disabled={pending} type="button" variant="secondary" onClick={leavePending}>
                    {pending ? "Guardando..." : "Dejar pendiente"}
                  </Button>
                  <Button disabled={pending} type="button" onClick={() => setCloseOpen(true)}>
                    <Save className="h-4 w-4" />
                    Cerrar conteo
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <AuditMetric label="Contados" value={`${summary.countedItems}/${summary.totalItems}`} />
                  <AuditMetric label="Piezas" value={`${summary.countedPieces}/${summary.expectedPieces}`} />
                  <AuditMetric label="Sobrantes" value={`+${summary.positiveDifference}`} />
                  <AuditMetric label="Faltantes" value={`-${summary.negativeDifference}`} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stockChanged ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Hay productos cuyo stock cambio despues de abrir el conteo. Al aplicar, se ajustara desde el stock actual al conteo capturado.
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="audit-scan">Buscar o escanear</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    id="audit-scan"
                    autoComplete="off"
                    className="pl-9"
                    placeholder="Codigo, nombre, marca o modelo"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      handleScanSubmit();
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audit-quantity">Cantidad</Label>
                <Input
                  id="audit-quantity"
                  min={1}
                  type="number"
                  value={scanQuantity}
                  onChange={(event) => setScanQuantity(event.target.value)}
                />
              </div>
              <Button disabled={pending || !query.trim()} type="button" onClick={handleScanSubmit}>
                <Plus className="h-4 w-4" />
                Sumar
              </Button>
            </div>

            <ScannedSummaryPanel items={workingAudit.items ?? []} />

            <div className="space-y-4">
              {groupedItems.map((group) => (
                <section key={group.category} className="rounded-lg border border-border">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <h2 className="font-semibold">{group.category}</h2>
                    <span className="text-sm text-muted-foreground">{group.items.filter((item) => item.counted).length}/{group.items.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/55 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-medium">Producto</th>
                          <th className="px-4 py-2 font-medium">Stock</th>
                          <th className="px-4 py-2 font-medium">Contado</th>
                          <th className="px-4 py-2 font-medium">Dif.</th>
                          <th className="px-4 py-2 text-right font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <AuditItemRow
                            key={item.id}
                            disabled={pending}
                            item={item}
                            onAdd={(quantity) => countItem(item, "add", quantity)}
                            onSet={(quantity) => countItem(item, "set", quantity)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <NewAuditPanel
            categories={categories}
            disabledCategoryIds={reservedCategoryIds}
            notes={notes}
            pending={pending}
            selectedCategoryIds={selectedCategoryIds}
            onNotesChange={setNotes}
            onStart={startAudit}
            onToggleCategory={toggleCategory}
          />
          <AuditHistory
            audits={audits}
            pending={pending}
            onContinue={(auditId) => {
              const audit = openAudits.find((entry) => entry.id === auditId) ?? null;
              setClosedAuditId(null);
              setLocalAudit(audit);
              setQuery("");
              setSelectedAuditId(auditId);
              saveQueueRef.current = Promise.resolve();
            }}
            onCancel={(audit) => setCancelAudit(audit)}
            onDetail={(auditNumber) => showDetail(auditNumber)}
            onReprint={reprint}
          />
        </>
      )}

      {closeOpen && workingAudit ? (
        <CloseAuditModal
          audit={workingAudit}
          pending={pending}
          stockChanged={stockChanged}
          summary={summary}
          onCancel={() => setCloseOpen(false)}
          onConfirm={submitClose}
        />
      ) : null}

      {cancelAudit ? (
        <CancelAuditModal
          audit={cancelAudit}
          pending={pending}
          onCancel={() => setCancelAudit(null)}
          onConfirm={() => submitCancel(cancelAudit)}
        />
      ) : null}

      {detailAudit ? (
        <AuditDetailModal
          audit={detailAudit}
          onClose={() => setDetailAudit(null)}
          onReprint={() => reprint(detailAudit.audit_number)}
        />
      ) : null}

      {printAudit ? <InventoryAuditReceiptPrintArea audit={printAudit} context={receiptContext} /> : null}
    </div>
  );
}

function NewAuditPanel({
  categories,
  disabledCategoryIds,
  notes,
  pending,
  selectedCategoryIds,
  onNotesChange,
  onStart,
  onToggleCategory,
}: {
  categories: CatalogItem[];
  disabledCategoryIds: Set<string>;
  notes: string;
  pending: boolean;
  selectedCategoryIds: string[];
  onNotesChange: (value: string) => void;
  onStart: () => void;
  onToggleCategory: (id: string) => void;
}) {
  return (
    <Card className="motion-surface">
      <CardHeader>
        <CardTitle>Nueva auditoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CategoryMultiSearch
          categories={categories}
          disabledCategoryIds={disabledCategoryIds}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={onToggleCategory}
        />
        <div className="space-y-2">
          <Label htmlFor="audit-notes">Notas</Label>
          <Textarea
            id="audit-notes"
            placeholder="Turno, responsable, pasillo o comentario interno"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={pending || selectedCategoryIds.length === 0} type="button" onClick={onStart}>
            <ClipboardCheck className="h-4 w-4" />
            {pending ? "Abriendo..." : "Abrir conteo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryMultiSearch({
  categories,
  disabledCategoryIds,
  selectedCategoryIds,
  onToggleCategory,
}: {
  categories: CatalogItem[];
  disabledCategoryIds: Set<string>;
  selectedCategoryIds: string[];
  onToggleCategory: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const selected = categories.filter((category) => selectedCategoryIds.includes(category.id));
  const available = categories.filter((category) => !selectedCategoryIds.includes(category.id) && !disabledCategoryIds.has(category.id));
  const filtered = available.filter((category) => category.name.toLowerCase().includes(query.trim().toLowerCase()));
  const reservedCount = categories.filter((category) => disabledCategoryIds.has(category.id)).length;

  function select(id: string) {
    onToggleCategory(id);
    setQuery("");
    setOpen(true);
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Categorias</Label>
        <p className="text-sm text-muted-foreground">Crea categorias antes de abrir conteo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="audit-category-search">Categorias</Label>
      <div className="rounded-lg border border-border bg-background p-2">
        {selected.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selected.map((category) => (
              <span
                key={category.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
              >
                <span className="truncate">{category.name}</span>
                <button
                  aria-label={`Quitar ${category.name}`}
                  className="rounded-full p-0.5 hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="button"
                  onClick={() => onToggleCategory(category.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div ref={triggerRef} className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="audit-category-search"
            autoComplete="off"
            className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
            placeholder="Buscar categoria y Enter para agregar"
            value={query}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || filtered.length === 0) return;
              event.preventDefault();
              select(filtered[0].id);
            }}
          />
          <FloatingListbox
            className="border-border bg-popover text-popover-foreground shadow-slate-950/15 ring-border/60"
            open={open}
            triggerRef={triggerRef}
            onPointerDownOutside={() => setOpen(false)}
          >
            {(position) => (
              <div className="overflow-auto p-1.5" style={{ maxHeight: position.maxHeight }}>
                {filtered.length === 0 ? (
                  <div className="rounded-md px-3 py-2.5 text-sm text-muted-foreground">
                    {available.length === 0 ? "Todas las categorias seleccionadas." : "Sin resultados."}
                  </div>
                ) : (
                  filtered.map((category) => (
                    <button
                      key={category.id}
                      className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => select(category.id)}
                    >
                      <span className="min-w-0 truncate">{category.name}</span>
                      <Check className="h-4 w-4 opacity-45" />
                    </button>
                  ))
                )}
              </div>
            )}
          </FloatingListbox>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.length} seleccionadas. {reservedCount > 0 ? `${reservedCount} en conteos abiertos.` : null}
      </p>
    </div>
  );
}

function ScannedSummaryPanel({ items }: { items: InventoryAuditItem[] }) {
  const countedItems = items.filter((item) => item.counted && item.counted_quantity !== null);
  const differenceItems = countedItems.filter((item) => item.difference !== 0);

  return (
    <details className="rounded-lg border border-border bg-muted/25 p-3" open>
      <summary className="cursor-pointer text-sm font-semibold outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
        Detalle capturado ({countedItems.length})
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <AuditMetric label="Escaneados" value={`${countedItems.length}/${items.length}`} />
        <AuditMetric label="Con diferencia" value={`${differenceItems.length}`} />
        <AuditMetric label="Sobrantes" value={`+${differenceItems.reduce((total, item) => total + Math.max(item.difference, 0), 0)}`} />
        <AuditMetric label="Faltantes" value={`-${differenceItems.reduce((total, item) => total + Math.abs(Math.min(item.difference, 0)), 0)}`} />
      </div>
      {countedItems.length > 0 ? (
        <div className="mt-3 max-h-72 overflow-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Contado</th>
                <th className="px-3 py-2 font-medium">Dif.</th>
              </tr>
            </thead>
            <tbody>
              {countedItems.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="min-w-60 px-3 py-2">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.product_code}</p>
                  </td>
                  <td className="px-3 py-2">{item.initial_stock}</td>
                  <td className="px-3 py-2">{item.counted_quantity ?? 0}</td>
                  <td className="px-3 py-2">
                    <Badge variant={item.difference < 0 ? "destructive" : item.difference > 0 ? "warning" : "success"}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Sin productos capturados.</p>
      )}
    </details>
  );
}

function AuditHistory({
  audits,
  pending,
  onContinue,
  onCancel,
  onDetail,
  onReprint,
}: {
  audits: InventoryAudit[];
  pending: boolean;
  onContinue: (auditId: string) => void;
  onCancel: (audit: InventoryAudit) => void;
  onDetail: (auditNumber: string) => void;
  onReprint: (auditNumber: string) => void;
}) {
  if (audits.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Sin auditorias"
        description="Abre una auditoria por categoria para comenzar el conteo."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditorias</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/55 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Folio</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Categorias</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Resumen</th>
                <th className="px-4 py-2 text-right font-medium">Accion</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{audit.audit_number}</td>
                  <td className="px-4 py-3">
                    <Badge variant={audit.status === "open" ? "warning" : audit.status === "canceled" ? "destructive" : audit.apply_inventory ? "success" : "secondary"}>
                      {audit.status === "open" ? "Abierto" : audit.status === "canceled" ? "Cancelado" : audit.apply_inventory ? "Aplicado" : "Cerrado"}
                    </Badge>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="block truncate">{audit.category_names.join(", ")}</span>
                  </td>
                  <td className="px-4 py-3">{formatDate(audit.closed_at ?? audit.created_at)}</td>
                  <td className="px-4 py-3">
                    {audit.counted_items}/{audit.total_items} · +{audit.positive_difference} / -{audit.negative_difference}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {audit.status === "open" ? (
                      <div className="flex justify-end gap-2">
                        <Button disabled={pending} type="button" variant="outline" onClick={() => onContinue(audit.id)}>
                          Volver al inventario
                        </Button>
                        <Button disabled={pending} size="icon" title="Cancelar inventario" type="button" variant="destructive" onClick={() => onCancel(audit)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : audit.status === "closed" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label="Ver detalle"
                          disabled={pending}
                          size="icon"
                          title="Ver detalle"
                          type="button"
                          variant="ghost"
                          onClick={() => onDetail(audit.audit_number)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label="Imprimir ticket"
                          disabled={pending}
                          size="icon"
                          title="Imprimir ticket"
                          type="button"
                          variant="ghost"
                          onClick={() => onReprint(audit.audit_number)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin accion</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditItemRow({
  disabled,
  item,
  onAdd,
  onSet,
}: {
  disabled: boolean;
  item: InventoryAuditItem;
  onAdd: (quantity: number) => void;
  onSet: (quantity: number) => void;
}) {
  const counted = item.counted_quantity ?? 0;
  const difference = item.counted ? counted - item.initial_stock : 0;

  return (
    <tr className="border-t border-border">
      <td className="min-w-72 px-4 py-3">
        <p className="font-medium">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">{[item.product_code, item.brand, item.model].filter(Boolean).join(" · ")}</p>
      </td>
      <td className="px-4 py-3">{item.initial_stock}</td>
      <td className="px-4 py-3">
        <Input
          key={`${item.id}-${item.counted_quantity ?? ""}`}
          className="h-9 w-24"
          defaultValue={item.counted_quantity ?? ""}
          min={0}
          type="number"
          onBlur={(event) => onSet(Math.max(0, Number(event.currentTarget.value) || 0))}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.currentTarget.blur();
          }}
        />
      </td>
      <td className="px-4 py-3">
        <Badge variant={!item.counted ? "secondary" : difference < 0 ? "destructive" : difference > 0 ? "warning" : "success"}>
          {!item.counted ? "Pendiente" : difference > 0 ? `+${difference}` : difference}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Button aria-label="Sumar uno" disabled={disabled} size="icon" title="Sumar uno" type="button" variant="ghost" onClick={() => onAdd(1)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button aria-label="Restar uno" disabled={disabled || counted <= 0} size="icon" title="Restar uno" type="button" variant="ghost" onClick={() => onSet(Math.max(0, counted - 1))}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button disabled={disabled} type="button" variant="outline" onClick={() => onSet(0)}>
            0
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CloseAuditModal({
  audit,
  pending,
  stockChanged,
  summary,
  onCancel,
  onConfirm,
}: {
  audit: InventoryAudit;
  pending: boolean;
  stockChanged: boolean;
  summary: ReturnType<typeof summarizeItems>;
  onCancel: () => void;
  onConfirm: (options: CloseOptions) => void;
}) {
  const [applyInventory, setApplyInventory] = useState(true);
  const [uncountedPolicy, setUncountedPolicy] = useState<"ignore" | "zero">("ignore");
  const pendingItems = summary.totalItems - summary.countedItems;

  return (
    <ModalOverlay role="alertdialog">
      <div className="animate-pop w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Cerrar {audit.audit_number}</h2>
          <p className="text-sm text-muted-foreground">Revisa resumen antes de cerrar. Ticket se imprimira al finalizar.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-sm">
          <SummaryRow label="Productos" value={`${summary.countedItems}/${summary.totalItems}`} />
          <SummaryRow label="Piezas sistema" value={`${summary.expectedPieces}`} />
          <SummaryRow label="Piezas contadas" value={`${summary.countedPieces}`} />
          <SummaryRow label="Diferencia" value={`+${summary.positiveDifference} / -${summary.negativeDifference}`} strong />
        </div>

        {stockChanged ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Stock cambio durante el conteo. Se ajustara desde stock actual si decides aplicar inventario.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={applyInventory}
              className="h-4 w-4"
              type="checkbox"
              onChange={(event) => setApplyInventory(event.target.checked)}
            />
            Actualizar inventario al cerrar
          </label>

          {pendingItems > 0 ? (
            <div className="space-y-2">
              <Label>Productos pendientes ({pendingItems})</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className={cn("rounded-lg border border-border px-3 py-2 text-left text-sm", uncountedPolicy === "ignore" && "border-primary bg-accent text-accent-foreground")}
                  type="button"
                  onClick={() => setUncountedPolicy("ignore")}
                >
                  No tocar
                </button>
                <button
                  className={cn("rounded-lg border border-border px-3 py-2 text-left text-sm", uncountedPolicy === "zero" && "border-primary bg-accent text-accent-foreground")}
                  type="button"
                  onClick={() => setUncountedPolicy("zero")}
                >
                  Contar como 0
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={pending} type="button" variant="secondary" onClick={onCancel}>
            Revisar
          </Button>
          <Button disabled={pending} type="button" onClick={() => onConfirm({ applyInventory, uncountedPolicy })}>
            <Save className="h-4 w-4" />
            {pending ? "Cerrando..." : "Cerrar conteo"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function CancelAuditModal({
  audit,
  pending,
  onCancel,
  onConfirm,
}: {
  audit: InventoryAudit;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const summary = summarizeItems(audit.items ?? []);

  return (
    <ModalOverlay role="alertdialog">
      <div className="animate-pop w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Cancelar {audit.audit_number}</h2>
          <p className="text-sm text-muted-foreground">
            Esto cancelara el inventario abierto y conservara registro. No actualiza stock.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-sm">
          <SummaryRow label="Productos" value={`${summary.countedItems}/${summary.totalItems}`} />
          <SummaryRow label="Piezas contadas" value={`${summary.countedPieces}`} />
          <SummaryRow label="Sobrantes" value={`+${summary.positiveDifference}`} />
          <SummaryRow label="Faltantes" value={`-${summary.negativeDifference}`} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={pending} type="button" variant="secondary" onClick={onCancel}>
            Volver
          </Button>
          <Button disabled={pending} type="button" variant="destructive" onClick={onConfirm}>
            <Ban className="h-4 w-4" />
            {pending ? "Cancelando..." : "Cancelar inventario"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function AuditDetailModal({
  audit,
  onClose,
  onReprint,
}: {
  audit: InventoryAudit;
  onClose: () => void;
  onReprint: () => void;
}) {
  const summary = summarizeItems(audit.items ?? []);
  const countedItems = (audit.items ?? []).filter((item) => item.counted && item.counted_quantity !== null);

  return (
    <ModalOverlay role="dialog">
      <div className="animate-pop flex max-h-[86vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Detalle {audit.audit_number}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{audit.category_names.join(", ")}</p>
          </div>
          <Button aria-label="Cerrar detalle" size="icon" type="button" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <AuditMetric label="Productos" value={`${summary.countedItems}/${summary.totalItems}`} />
            <AuditMetric label="Piezas" value={`${summary.countedPieces}/${summary.expectedPieces}`} />
            <AuditMetric label="Sobrantes" value={`+${summary.positiveDifference}`} />
            <AuditMetric label="Faltantes" value={`-${summary.negativeDifference}`} />
          </div>
          <div className="rounded-md border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
              <h3 className="text-sm font-semibold">Productos capturados</h3>
              <Badge variant="secondary">{countedItems.length}</Badge>
            </div>
            {countedItems.length > 0 ? (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 font-medium">Stock</th>
                      <th className="px-3 py-2 font-medium">Contado</th>
                      <th className="px-3 py-2 font-medium">Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countedItems.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="min-w-64 px-3 py-2">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{[item.product_code, item.brand, item.model].filter(Boolean).join(" · ")}</p>
                        </td>
                        <td className="px-3 py-2">{item.initial_stock}</td>
                        <td className="px-3 py-2">{item.counted_quantity ?? 0}</td>
                        <td className="px-3 py-2">
                          <Badge variant={item.difference < 0 ? "destructive" : item.difference > 0 ? "warning" : "success"}>
                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-3 text-sm text-muted-foreground">Sin productos capturados.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border p-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" onClick={onReprint}>
            <Printer className="h-4 w-4" />
            Imprimir ticket
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function InventoryAuditReceiptPrintArea({ audit, context }: { audit: InventoryAudit; context: ReceiptContext }) {
  const summary = summarizeItems(audit.items ?? []);
  const user = audit.users?.full_name || audit.users?.email || context.user.full_name || context.user.email;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="print-area sale-receipt-print-area sale-receipt-80">
      <article className="sale-receipt">
        <header className="sale-receipt-header">
          <p className="sale-receipt-company">{context.company.name}</p>
          <p>{context.company.slug}</p>
          <p>Ticket de conteo</p>
        </header>

        <section className="sale-receipt-section">
          <ReceiptLine label="Folio" value={audit.audit_number} />
          <ReceiptLine label="Fecha" value={formatReceiptDate(audit.closed_at ?? audit.created_at)} />
          <ReceiptLine label="Usuario" value={user} />
          <ReceiptLine label="Estado" value={audit.status === "open" ? "Abierto" : "Cerrado"} />
          <ReceiptLine label="Inventario" value={audit.apply_inventory ? "Actualizado" : "Sin actualizar"} />
        </section>

        <section className="sale-receipt-section">
          <p className="sale-receipt-subtitle">Categorias</p>
          <p>{audit.category_names.join(", ")}</p>
        </section>

        <section className="sale-receipt-section">
          <ReceiptLine label="Productos" value={`${summary.countedItems}/${summary.totalItems}`} />
          <ReceiptLine label="Piezas sistema" value={`${summary.expectedPieces}`} />
          <ReceiptLine label="Piezas contadas" value={`${summary.countedPieces}`} />
          <ReceiptLine label="Sobrantes" value={`+${summary.positiveDifference}`} />
          <ReceiptLine label="Faltantes" value={`-${summary.negativeDifference}`} />
        </section>

        <section className="sale-receipt-section">
          <p className="sale-receipt-subtitle">Diferencias</p>
          {(audit.items ?? []).filter((item) => item.counted && item.difference !== 0).slice(0, 8).map((item) => (
            <div key={item.id} className="sale-receipt-item">
              <div>
                <p>{item.product_name}</p>
                <p className="sale-receipt-muted">{item.product_code} · {item.initial_stock} {"->"} {item.counted_quantity ?? 0}</p>
              </div>
              <strong>{item.difference > 0 ? `+${item.difference}` : item.difference}</strong>
            </div>
          ))}
          {(audit.items ?? []).filter((item) => item.counted && item.difference !== 0).length === 0 ? <p>Sin diferencias.</p> : null}
        </section>

        {audit.notes ? (
          <section className="sale-receipt-section">
            <p className="sale-receipt-subtitle">Notas</p>
            <p>{audit.notes}</p>
          </section>
        ) : null}

        <footer className="sale-receipt-footer">
          <p>Generado por Pulso.</p>
        </footer>
      </article>
    </div>,
    document.body,
  );
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-lg border border-border bg-muted/35 px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", strong && "font-semibold")}>{value}</span>
    </>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="sale-receipt-line">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function getOptimisticCountItem(item: InventoryAuditItem, mode: "add" | "set", quantity: number) {
  const countedQuantity = mode === "add" ? (item.counted_quantity ?? 0) + quantity : quantity;
  return {
    ...item,
    counted: true,
    counted_quantity: countedQuantity,
    difference: countedQuantity - item.initial_stock,
  };
}

function updateAuditItem(audit: InventoryAudit | null, item: InventoryAuditItem) {
  if (!audit) return audit;
  return {
    ...audit,
    items: (audit.items ?? []).map((current) => (
      current.id === item.id ? { ...current, ...item, products: item.products ?? current.products } : current
    )),
  };
}

function mergeCountResult(audit: InventoryAudit | null, result: CountInventoryAuditItemResult) {
  const nextAudit = updateAuditItem(audit, result.item);
  if (!nextAudit) return nextAudit;
  return {
    ...nextAudit,
    total_items: result.summary.totalItems,
    counted_items: result.summary.countedItems,
    expected_pieces: result.summary.expectedPieces,
    counted_pieces: result.summary.countedPieces,
    positive_difference: result.summary.positiveDifference,
    negative_difference: result.summary.negativeDifference,
  };
}

function summarizeItems(items: InventoryAuditItem[]) {
  return items.reduce(
    (summary, item) => {
      const counted = item.counted && item.counted_quantity !== null;
      const difference = counted ? (item.counted_quantity ?? 0) - item.initial_stock : 0;
      summary.totalItems += 1;
      summary.expectedPieces += item.initial_stock;
      if (counted) {
        summary.countedItems += 1;
        summary.countedPieces += item.counted_quantity ?? 0;
        if (difference > 0) summary.positiveDifference += difference;
        if (difference < 0) summary.negativeDifference += Math.abs(difference);
      }
      return summary;
    },
    {
      totalItems: 0,
      countedItems: 0,
      expectedPieces: 0,
      countedPieces: 0,
      positiveDifference: 0,
      negativeDifference: 0,
    },
  );
}

function groupItemsByCategory(items: InventoryAuditItem[]) {
  const groups = new Map<string, InventoryAuditItem[]>();
  items.forEach((item) => {
    const category = item.category || "Sin categoria";
    groups.set(category, [...(groups.get(category) ?? []), item]);
  });
  return Array.from(groups, ([category, groupItems]) => ({ category, items: groupItems }));
}

function itemMatchesQuery(item: InventoryAuditItem, query: string) {
  return [item.product_code, item.product_name, item.brand, item.model, item.category]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function formatReceiptDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
