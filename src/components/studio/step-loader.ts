// Loads a studio step's code once and remembers it, so a step whose code is already here renders
// on the click that opens it. React.lazy (and next/dynamic, built on it) can't: its first render
// always suspends, even for a module already downloaded, and React then holds the fallback for at
// least 300 ms before it reveals the step (its Suspense throttle).

export type StepLoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "failed"; error: unknown };

export type StepLoader<T> = {
  // Starts the load, or joins the one in flight. A failed load starts over on the next call.
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
