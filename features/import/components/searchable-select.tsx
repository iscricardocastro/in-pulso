"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { FloatingListbox } from "@/components/ui/floating-listbox";
import { Input } from "@/components/ui/input";
import type { SearchableSelectOption } from "@/features/import/types";
import { cn } from "@/lib/utils";

export function SearchableSelect({
  value,
  options,
  placeholder,
  emptyLabel = "Sin resultados",
  onChange,
}: {
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  emptyLabel?: string;
  onChange: (value: string) => void;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const displayValue = open ? query : selected?.label ?? "";
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));

  function select(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function resetQuery() {
    window.setTimeout(() => setOpen(false), 120);
  }

  function openList() {
    setQuery("");
    setOpen(true);
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
            "h-10 cursor-pointer pr-10 shadow-xs",
            open &&
              "border-slate-400 bg-white ring-2 ring-slate-950/10 dark:border-slate-600 dark:bg-slate-950 dark:ring-white/10",
          )}
          placeholder={placeholder}
          value={displayValue}
          onBlur={resetQuery}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onClick={() => {
            if (!open) openList();
          }}
          onFocus={openList}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              resetQuery();
            }
            if (event.key === "Enter" && filtered[0]) {
              event.preventDefault();
              select(filtered[0]);
            }
          }}
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
          <div className="overflow-auto p-1.5" style={{ maxHeight: position.maxHeight }}>
            {filtered.length === 0 ? (
              <div className="rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                {emptyLabel}
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    aria-selected={isSelected}
                    key={`${option.value}-${option.label}`}
                    className={cn(
                      "flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-slate-900 dark:focus-visible:bg-slate-900",
                      isSelected &&
                        "bg-blue-50 font-medium text-blue-700 hover:bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/40",
                    )}
                    role="option"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(option)}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        )}
      </FloatingListbox>
    </div>
  );
}
