import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type EyebrowProps = ComponentProps<"p"> & {
  as?: "p" | "span" | "figcaption";
};

// Capitals come from CSS only, so screen readers don't spell the text out.
export function Eyebrow({ as: Tag = "p", className, ...props }: EyebrowProps) {
  return (
    <Tag
      {...props}
      className={cn("text-xs/4 font-medium tracking-widest text-subtle uppercase", className)}
    />
  );
}
