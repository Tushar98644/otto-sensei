import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type EyebrowProps = ComponentProps<"p"> & {
  as?: "p" | "span" | "figcaption";
};

// The tiny gray capitals over a title or a product view. The only place capitals come from: the
// text itself stays in sentence case, so screen readers don't spell it out.
export function Eyebrow({ as: Tag = "p", className, ...props }: EyebrowProps) {
  return (
    <Tag
      {...props}
      className={cn("text-xs/4 font-medium tracking-widest text-subtle uppercase", className)}
    />
  );
}
