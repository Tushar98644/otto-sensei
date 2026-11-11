// React.lazy suspends on first render even when loaded, and Suspense holds fallbacks 300 ms.

export type StepLoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "failed"; error: unknown };

export type StepLoader<T> = {
  load: () => Promise<T>;
  // The same object until the state changes, as useSyncExternalStore needs.
  getState: () => StepLoadState<T>;
  subscribe: (listener: () => void) => () => void;
};

const IDLE = { status: "idle" } as const;
const LOADING = { status: "loading" } as const;

export function createStepLoader<T>(importer: () => Promise<T>): StepLoader<T> {
  let state: StepLoadState<T> = IDLE;
  let inflight: Promise<T> | null = null;
  const listeners = new Set<() => void>();

  function set(next: StepLoadState<T>) {
    state = next;
    for (const listener of listeners) listener();
  }

  function load(): Promise<T> {
    if (state.status === "ready") return Promise.resolve(state.value);
    if (inflight) return inflight;
    set(LOADING);
    inflight = importer().then(
      (value) => {
        inflight = null;
        set({ status: "ready", value });
        return value;
      },
      (error: unknown) => {
        inflight = null;
        set({ status: "failed", error });
        throw error;
      },
    );
    return inflight;
  }

  return {
    load,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
