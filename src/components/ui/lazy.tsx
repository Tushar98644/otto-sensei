"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { createStepLoader, type StepLoader } from "@/components/studio/step-loader";

export function lazyComponent<P extends object>(
  importer: () => Promise<ComponentType<P>>,
): StepLoader<ComponentType<P>> {
  return createStepLoader(importer);
}

const IDLE_TIMEOUT_MS = 4_000;

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
  wanted: boolean;
  props: P;
}) {
  const state = useSyncExternalStore(loader.subscribe, loader.getState, loader.getState);

  useEffect(() => {
    if (loader.getState().status === "ready") return;
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

  // A failed download is tried again on the next click or key press, not only after a reload.
  useEffect(() => {
    if (!wanted || state.status !== "failed") return;
    const retry = () => void loader.load().catch(() => {});
    const options = { capture: true } as const;
    window.addEventListener("pointerdown", retry, options);
    window.addEventListener("keydown", retry, options);
    return () => {
      window.removeEventListener("pointerdown", retry, options);
      window.removeEventListener("keydown", retry, options);
    };
  }, [loader, wanted, state.status]);

  if (!wanted || state.status !== "ready") return null;
  const Component = state.value;
  return <Component {...props} />;
}
