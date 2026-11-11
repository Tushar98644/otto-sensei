import Link from "next/link";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import { OttoMark } from "./otto-mark";
import { ROUTES } from "./routes";

export type SiteLogoProps = {
  className?: string;
  compact?: boolean;
};

export function SiteLogo({ className, compact = false }: SiteLogoProps) {
  return (
    <Link
      href={ROUTES.home}
      className={cn(
        "inline-flex h-12 items-center gap-2 rounded-lg sm:h-11",
        compact ? "min-w-0" : "shrink-0",
        className,
      )}
    >
      <OttoMark className="size-7 sm:size-8" />
      <span
        className={cn(
          "font-display text-xl/none font-medium tracking-tight text-ink sm:text-2xl/none",
          compact && "min-w-0 truncate @max-xs:sr-only",
        )}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}
