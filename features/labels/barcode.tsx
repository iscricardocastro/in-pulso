"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

export function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      width: 1.5,
      height: 42,
      displayValue: false,
      margin: 0,
    });
  }, [value]);

  return <svg ref={ref} aria-label={`Codigo de barras ${value}`} />;
}
