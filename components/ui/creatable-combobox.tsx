"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatingListbox } from "@/components/ui/floating-listbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ComboboxOption = {
  id: string;
  name: string;
};

type CreatableComboboxProps = {
  value: string;
  options: ComboboxOption[];
  placeholder: string;
  emptyLabel?: string;
  createSuccessMessage?: string;
  disabled?: boolean;
  valueMode?: "name" | "id";
  selectedValue?: string;
  onChange: (value: string) => void;
  onSelect?: (option: ComboboxOption) => void;
  onCreate?: (name: string) => Promise<ComboboxOption>;
};

export function CreatableCombobox({
  value,
  options,
  placeholder,
  emptyLabel = "Sin resultados",
  createSuccessMessage = "Catalogo actualizado",
  disabled = false,
  valueMode = "name",
  selectedValue,
  onChange,
  onSelect,
  onCreate,
}: CreatableComboboxProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [localOptions, setLocalOptions] = useState(options);
  const [pending, startTransition] = useTransition();
  const allOptions = useMemo(() => mergeOptions(options, localOptions), [options, localOptions]);
  const displayValue = open ? query : value;
  const filtered = allOptions.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const exactOption = allOptions.find((option) => option.name.toLowerCase() === query.trim().toLowerCase());

  function openList() {
    if (disabled) return;
    if (open) return;
    setQuery("");
    setOpen(true);
  }

  function select(option: ComboboxOption) {
    onChange(valueMode === "id" ? option.id : option.name);
    onSelect?.(option);
    setQuery(option.name);
    setOpen(false);
  }

  function create() {
    const name = query.trim();
    if (!name || !onCreate) return;
    startTransition(async () => {
      try {
        const created = await onCreate(name);
        setLocalOptions((current) => mergeOptions(current, [created]));
        select(created);
        toast.success(createSuccessMessage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear");
      }
    });
  }

  return (
    <div ref={triggerRef} className="relative">
      <div className="relative">
        <Input
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
          className={cn(
            "pr-10 shadow-xs",
            open &&
              "border-slate-400 bg-white ring-2 ring-slate-950/10 dark:border-slate-600 dark:bg-slate-950 dark:ring-white/10",
          )}
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
            if (!query.trim()) {
              setQuery(value);
              return;
            }
            if (exactOption) {
              select(exactOption);
              return;
            }
            const nextValue = query.trim();
            if (valueMode === "id") {
              setQuery(value);
              return;
            }
            onChange(nextValue);
            setQuery(nextValue);
          }}
          onChange={(event) => {
            if (disabled) return;
            setQuery(event.target.value);
            setOpen(true);
          }}
          onClick={openList}
          onFocus={openList}
        />
        <ChevronsUpDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform",
            open && "rotate-180 text-foreground",
          )}
        />
      </div>

      <FloatingListbox id={listId} open={open} triggerRef={triggerRef}>
        {(position) => (
          <>
          <div className="overflow-auto p-1.5" style={{ maxHeight: onCreate ? Math.max(120, position.maxHeight - 48) : position.maxHeight }}>
            {filtered.length === 0 ? (
              <div className="rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                {emptyLabel}
              </div>
            ) : (
              filtered.map((option) => {
                const selected = (selectedValue ?? value) === (valueMode === "id" ? option.id : option.name);

                return (
                  <button
                    aria-selected={selected}
                    key={option.id}
                    className={cn(
                      "flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-slate-900 dark:focus-visible:bg-slate-900",
                      selected &&
                        "bg-blue-50 font-medium text-blue-700 hover:bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/40",
                    )}
                    role="option"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(option)}
                  >
                    <span className="min-w-0 truncate">{option.name}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>

          {onCreate && query.trim() && !exactOption ? (
            <div className="border-t border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
              <Button
                className="h-9 w-full justify-start rounded-md px-3 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50 dark:hover:text-blue-200"
                disabled={pending}
                size="sm"
                type="button"
                variant="ghost"
                onMouseDown={(event) => event.preventDefault()}
                onClick={create}
              >
                <Plus className="h-4 w-4" />
                <span className="min-w-0 truncate">
                  {pending ? "Agregando..." : `Agregar "${query.trim()}"`}
                </span>
              </Button>
            </div>
          ) : null}
          </>
        )}
      </FloatingListbox>
    </div>
  );
}

function mergeOptions(left: ComboboxOption[], right: ComboboxOption[]) {
  return Array.from(new Map([...left, ...right].map((option) => [option.name.toLowerCase(), option])).values()).sort(
    (a, b) => a.name.localeCompare(b.name),
  );
}
