import { Skeleton } from "@/components/ui/skeleton";

export function AccountSkeleton() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <p role="status" className="sr-only">
        Loading your account…
      </p>
      <Skeleton aria-hidden className="h-11 w-full rounded-xl sm:w-96" />
      <div aria-hidden className="flex flex-col gap-4">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
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
