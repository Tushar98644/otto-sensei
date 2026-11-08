import Link from "next/link";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import { OttoMark } from "./otto-mark";
import { ROUTES } from "./routes";

export type SiteLogoProps = {
  className?: string;
  // For the header: when the nearest @container is under 20rem (320px phones), the wordmark is only
  // read to screen readers so the call to action still fits. It also truncates rather than pushing
  // the row wider than the screen if a font renders wider than expected.
  compact?: boolean;
};

export function SiteLogo({ className, compact = false }: SiteLogoProps) {
  return (
    <Link
      href={ROUTES.home}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-lg",
        compact ? "min-w-0" : "shrink-0",
        className,
      )}
    >
      <OttoMark className="size-7 sm:size-8" />
      {/* The one weight-500 serif on the site: at 24px the regular weight looks too faint for a mark. */}
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
