"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalOverlay } from "@/components/ui/modal-overlay";

type ConfirmDeleteButtonProps = {
  disabled?: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDeleteButton({
  disabled,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  async function handleConfirm() {
    setIsDeleting(true);

    try {
      await onConfirm();
      setOpen(false);
    } catch {
      return;
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        aria-label={title}
        disabled={disabled || isDeleting}
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>

      {open ? (
        <ModalOverlay
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          role="alertdialog"
        >
          <div className="animate-pop w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="space-y-2">
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={isDeleting} type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={isDeleting}
                type="button"
                variant="destructive"
                onClick={handleConfirm}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isDeleting ? "Eliminando..." : confirmLabel}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </>
  );
}
