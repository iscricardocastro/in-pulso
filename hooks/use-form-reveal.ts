"use client";

import { useCallback, useRef } from "react";

export function useFormReveal<TElement extends HTMLElement = HTMLDivElement>() {
  const formRef = useRef<TElement>(null);

  const revealForm = useCallback(() => {
    requestAnimationFrame(() => {
      const container = formRef.current;
      if (!container) return;

      container.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return { formRef, revealForm };
}
