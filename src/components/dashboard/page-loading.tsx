import { Skeleton } from "@/components/ui/skeleton";

// Moving between dashboard pages: the sidebar stays and only the page area waits, as a quiet
// outline of a page. It appears only after 300 ms, so quick moves show nothing at all (people read
// waits under about a second as instant; a flash of placeholder in that time reads as flicker).
// The full-screen Otto wait is kept for the app's first load and the way back from sign-in or
// checkout, not for every click.
export function DashboardPageLoading() {
  return (
    <div className="flex animate-fade-in flex-col gap-8 [animation-delay:300ms]">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
