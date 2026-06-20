import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:opacity-90 hover:shadow-premium",
        accent:
          "bg-accent text-accent-foreground hover:opacity-95 hover:shadow-glow",
        outline:
          "border border-border bg-transparent hover:bg-secondary/60 hover:border-foreground/25",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-foreground/70 hover:bg-secondary/60 hover:text-foreground",
        link: "h-auto rounded-none p-0 text-foreground underline-offset-4 hover:text-accent",
        glass: "glass text-foreground hover:bg-background/70",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        default: "h-11 px-6",
        lg: "h-12 px-7 text-[15px]",
        xl: "h-14 px-9 text-[15px]",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
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
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
