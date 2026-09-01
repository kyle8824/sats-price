import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full min-w-0 rounded-sm border border-border bg-surface px-2.5 py-2",
        "font-mono text-xl text-fg tabular-nums",
        "placeholder:text-muted",
        "transition-[border-color] duration-(--duration-quick) ease-smooth",
        "focus-visible:border-fg focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
