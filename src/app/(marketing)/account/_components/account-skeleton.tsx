import { Skeleton } from "@/components/ui/skeleton";

export function AccountSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        Loading your account…
      </p>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      {/* Plain HTML and CSS, so it still appears when the page's code never starts. */}
      <p className="animate-reveal-late px-1 text-sm text-muted">
        Still loading?{" "}
        <a href="" className="font-medium text-ink underline underline-offset-4">
          Reload the page
        </a>
      </p>
    </div>
  );
}
