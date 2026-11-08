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
    </div>
  );
}
