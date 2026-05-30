import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      secondary: "bg-secondary text-secondary-foreground",
      success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
      destructive: "bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
