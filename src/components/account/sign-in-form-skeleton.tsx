import { Skeleton } from "@/components/ui/skeleton";

export function SignInFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
