import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:scale-(--scale-press) transition-[color,background-color,border-color,transform,opacity] duration-(--duration-quick) ease-smooth",
  {
    variants: {
      variant: {
        default: "whitespace-nowrap rounded-sm bg-fg text-bg hover:opacity-90",
        outline:
          "whitespace-nowrap rounded-sm border border-border bg-transparent text-fg hover:bg-surface",
        ghost:
          "whitespace-nowrap rounded-sm bg-transparent text-muted hover:text-fg",
        chip: "max-w-full rounded-sm border border-border bg-bg text-fg hover:bg-surface data-[active=true]:border-fg data-[active=true]:bg-fg data-[active=true]:text-bg",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "h-8 px-2.5 text-sm",
        chip: "h-auto min-h-11 px-2.5 py-2 text-sm leading-snug",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
