"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { createStepLoader, type StepLoader } from "@/components/studio/step-loader";

// Code most visits never run (a dialog that may never open) loads after the page has settled
// instead of with it, and at once when it's wanted sooner. Unlike React.lazy, the component
// renders on the first render after its code is here, with no Suspense hold (see step-loader.ts).

export function lazyComponent<P extends object>(
  importer: () => Promise<ComponentType<P>>,
): StepLoader<ComponentType<P>> {
  return createStepLoader(importer);
}

const IDLE_TIMEOUT_MS = 4_000;

/** True from the first time `open` is: a lazy dialog then stays mounted, to animate closed. */
export function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

export function Lazy<P extends object>({
  loader,
  wanted,
  props,
}: {
  loader: StepLoader<ComponentType<P>>;
  // Load now; until then it loads once the browser is idle. Nothing renders before it's wanted.
  wanted: boolean;
  props: P;
}) {
  const state = useSyncExternalStore(loader.subscribe, loader.getState, loader.getState);

  useEffect(() => {
    if (loader.getState().status === "ready") return;
    // A failed load is tried again the next time this renders.
    const load = () => void loader.load().catch(() => {});
    if (wanted) {
      load();
      return;
    }
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(load, IDLE_TIMEOUT_MS / 2);
    return () => window.clearTimeout(timer);
  }, [loader, wanted]);

  if (!wanted || state.status !== "ready") return null;
  const Component = state.value;
  return <Component {...props} />;
}
