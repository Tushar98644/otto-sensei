import type { ReactNode } from "react";

// LoadingScreenHost's markup while nothing is loading, without its code, for a root where nothing can raise it.
export function StillLoadingScreen({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="contents">{children}</div>
      <div role="status" aria-live="polite" className="sr-only" />
    </>
  );
}
