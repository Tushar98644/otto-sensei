import {
  SECTION_ROW_HIDDEN,
  SETTINGS_CONTENT,
  SETTINGS_LAYOUT,
  SETTINGS_NAV_WIDTH,
} from "@/components/settings/sections";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GROUPS = [{ cards: ["h-28"] }, { cards: ["h-96"] }, { cards: ["h-64", "h-44"] }];

export function AccountSkeleton() {
  return (
    <div className={SETTINGS_LAYOUT}>
      <p role="status" className="sr-only">
        Loading your account…
      </p>
      <div aria-hidden className={cn("py-2", SECTION_ROW_HIDDEN)}>
        <Skeleton className="h-11 w-full rounded-xl pointer-coarse:h-13" />
      </div>
      <div
        aria-hidden
        className={cn(
          "hidden flex-col gap-0.5 rounded-2xl bg-surface p-2 lg:not-in-data-dashboard:flex xl:flex",
          SETTINGS_NAV_WIDTH,
        )}
      >
        <Skeleton className="mx-2.5 mt-2 mb-1 h-4 w-24" />
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="mx-2.5 my-2.5 h-4 w-32" />
        ))}
      </div>
      <div className={SETTINGS_CONTENT}>
        {GROUPS.map((group, index) => (
          <div key={index} aria-hidden className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 px-1">
              <Skeleton className="my-1 h-6 w-40" />
              <Skeleton className="my-1 h-4 w-full max-w-sm" />
            </div>
            {group.cards.map((height, card) => (
              <Skeleton key={card} className={cn("w-full rounded-2xl", height)} />
            ))}
          </div>
        ))}
        {/* Plain HTML and CSS, so it still appears when the page's code never starts. */}
        <p className="animate-reveal-late px-1 text-sm text-muted">
          Still loading?{" "}
          <a href="" className="font-medium text-ink underline underline-offset-4">
            Reload the page
          </a>
        </p>
      </div>
    </div>
  );
}
