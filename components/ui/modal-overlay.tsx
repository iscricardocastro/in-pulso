"use client";

import type { ComponentProps } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ModalOverlayProps = ComponentProps<"div">;

export function ModalOverlay({ className, children, role = "dialog", ...props }: ModalOverlayProps) {
  const portalTarget = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    const body = document.body;
    const currentCount = Number(body.dataset.modalLockCount || 0);
    body.dataset.modalLockCount = String(currentCount + 1);
    body.classList.add("has-modal");

    return () => {
      const nextCount = Math.max(0, Number(body.dataset.modalLockCount || 1) - 1);

      if (nextCount === 0) {
        body.classList.remove("has-modal");
        delete body.dataset.modalLockCount;
      } else {
        body.dataset.modalLockCount = String(nextCount);
      }
    };
  }, []);

  if (!portalTarget) return null;

  return createPortal(
    <div
      className={cn("animate-enter fixed inset-0 z-50 grid place-items-center p-4", className)}
      role={role}
      aria-modal="true"
      {...props}
    >
      {children}
    </div>,
    portalTarget,
  );
}
