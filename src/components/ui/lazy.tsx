"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import {
  createStepLoader,
  type StepLoader,
  type StepLoadState,
} from "@/components/studio/step-loader";

type LazyOptions = {
  // Starts the download as the page's code runs, for parts that show without a click.
  preload?: boolean;
};

export function preload<T>(loader: StepLoader<T>): void {
  if (typeof window !== "undefined") void loader.load().catch(() => {});
}

export function lazyModule<T>(
  importer: () => Promise<T>,
  { preload: early = false }: LazyOptions = {},
): StepLoader<T> {
  const loader = createStepLoader(importer);
  if (early) preload(loader);
  return loader;
}

export function lazyComponent<P extends object>(
  importer: () => Promise<ComponentType<P>>,
  options?: LazyOptions,
): StepLoader<ComponentType<P>> {
  return lazyModule(importer, options);
}

const IDLE_TIMEOUT_MS = 4_000;

export function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const timer = window.setTimeout(run, IDLE_TIMEOUT_MS / 2);
  return () => window.clearTimeout(timer);
}

export function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

function useLoadWhen<T>(
  loader: StepLoader<T>,
  wanted: boolean,
  status: StepLoadState<T>["status"],
) {
  useEffect(() => {
    if (loader.getState().status === "ready") return;
    const load = () => void loader.load().catch(() => {});
    if (wanted) {
      load();
      return;
    }
    return whenIdle(load);
  }, [loader, wanted]);

  // A failed download is tried again on the next click or key press, not only after a reload.
  useEffect(() => {
    if (!wanted || status !== "failed") return;
    const retry = () => void loader.load().catch(() => {});
    const options = { capture: true } as const;
    window.addEventListener("pointerdown", retry, options);
    window.addEventListener("keydown", retry, options);
    return () => {
      window.removeEventListener("pointerdown", retry, options);
      window.removeEventListener("keydown", retry, options);
    };
  }, [loader, wanted, status]);
}

// Loads at once when wanted, else when the browser is idle; null until the code is in.
export function useLazy<T>(loader: StepLoader<T>, wanted: boolean): T | null {
  const state = useSyncExternalStore(loader.subscribe, loader.getState, loader.getState);
  useLoadWhen(loader, wanted, state.status);
  return state.status === "ready" ? state.value : null;
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
  useLoadWhen(loader, wanted, state.status);
  if (!wanted || state.status !== "ready") return null;
  const Component = state.value;
  return <Component {...props} />;
}
