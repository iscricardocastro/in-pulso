"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type FloatingListboxPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type FloatingListboxProps = {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  id?: string;
  role?: string;
  className?: string;
  onPointerDownOutside?: () => void;
  children: ReactNode | ((position: FloatingListboxPosition) => ReactNode);
};

export function FloatingListbox({
  open,
  triggerRef,
  id,
  role = "listbox",
  className,
  onPointerDownOutside,
  children,
}: FloatingListboxProps) {
  const floatingRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<FloatingListboxPosition>({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 256,
  });

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const gap = 8;
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(288, openAbove ? spaceAbove - gap : spaceBelow - gap));
    const left = Math.max(
      viewportPadding,
      Math.min(rect.left, window.innerWidth - viewportPadding - rect.width),
    );

    setPosition({
      left,
      top: openAbove ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
      width: rect.width,
      maxHeight,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || floatingRef.current?.contains(target)) return;
      onPointerDownOutside?.();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [onPointerDownOutside, open, triggerRef, updatePosition]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={floatingRef}
      className={cn(
        "fixed z-[80] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-xl shadow-slate-950/10 ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:shadow-black/30 dark:ring-white/10",
        className,
      )}
      id={id}
      role={role}
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
      }}
    >
      {typeof children === "function" ? children(position) : children}
    </div>,
    document.body,
  );
}
