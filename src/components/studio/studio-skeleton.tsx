import { Skeleton } from "@/components/ui/skeleton";

export function StudioSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-8">
      <span className="sr-only">Loading your studio…</span>
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Skeleton className="size-11 rounded-lg" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="size-11 rounded-lg" />
      </div>
      <div className="hidden items-center gap-4 md:flex">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-7 flex-1 rounded-full" />
        ))}
      </div>
      <StepSkeleton />
    </div>
  );
}

export function StepSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Skeleton className="size-28 rounded-full" />
        <div className="flex w-full max-w-md flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
