"use client";

import { Input } from "@/components/ui/input";
import { cleanMoneyInput, formatMoneyInput, parseMoneyInput } from "@/lib/money";

export function MoneyInput({
  placeholder,
  value,
  onChange,
  selectOnFocus = true,
}: {
  placeholder?: string;
  value: number | string;
  onChange: (value: string) => void;
  selectOnFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        className="pl-7"
        inputMode="decimal"
        placeholder={placeholder}
        value={formatMoneyInput(value)}
        onChange={(event) => onChange(cleanMoneyInput(event.target.value))}
        onFocus={(event) => {
          const input = event.currentTarget;
          if (parseMoneyInput(input.value) === 0) onChange("");
          if (selectOnFocus) window.setTimeout(() => input.select(), 0);
        }}
      />
    </div>
  );
}
