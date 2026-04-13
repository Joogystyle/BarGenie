import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[8px] border-[2px] border-border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-noir-sm hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-noir-sm hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground shadow-noir-sm hover:bg-destructive/80",
        outline: "bg-popover text-foreground shadow-noir-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
