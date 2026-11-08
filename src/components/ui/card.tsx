import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Card pads itself, so plain content works too. The parts only add spacing and type styles.
// No border or shadow: a white card only reads on stone (a Panel or the studio canvas), so never
// put one straight on the paper background or inside another card.
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-col gap-4 rounded-2xl bg-surface p-4 text-ink sm:gap-5 sm:p-6",
        className,
      )}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("flex flex-col gap-1.5", className)} />;
}

export type CardTitleProps = ComponentProps<"h3"> & {
  as?: "h2" | "h3" | "h4";
};

export function CardTitle({ as: Heading = "h3", className, ...props }: CardTitleProps) {
  return (
    <Heading
      {...props}
      // font-sans: an h2 would otherwise pick up the serif from the base layer.
      className={cn("font-sans text-lg/7 font-medium text-ink", className)}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={cn("text-sm text-muted", className)} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("min-w-0", className)} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("flex flex-wrap items-center gap-3", className)} />;
}
