import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border-[3px] border-border text-sm font-semibold uppercase tracking-[0.06em] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-noir-sm hover:-translate-y-0.5 hover:bg-accent active:translate-x-[2px] active:translate-y-[2px] active:shadow-noir-pressed",
        destructive:
          "bg-destructive text-destructive-foreground shadow-noir-sm hover:-translate-y-0.5 hover:bg-destructive/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-noir-pressed",
        outline:
          "bg-card text-foreground shadow-noir-sm hover:-translate-y-0.5 hover:bg-secondary active:translate-x-[2px] active:translate-y-[2px] active:shadow-noir-pressed",
        secondary:
          "bg-secondary text-secondary-foreground shadow-noir-sm hover:-translate-y-0.5 hover:bg-muted active:translate-x-[2px] active:translate-y-[2px] active:shadow-noir-pressed",
        ghost:
          "border-transparent text-foreground shadow-none hover:border-border hover:bg-secondary hover:shadow-noir-sm",
        link: "border-transparent p-0 text-primary shadow-none hover:text-accent hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
