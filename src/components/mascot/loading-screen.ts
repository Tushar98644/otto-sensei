// Framework-free so its timing can be tested. One screen serves every request, so two never stack
// and a hand-off between pages doesn't blink. A request ending within delayMs never shows it; once
// shown it stays minShownMs so it can't flash, then fades for fadeMs.

export const LOADING_SCREEN_TIMING = { delayMs: 400, minShownMs: 600, fadeMs: 250 } as const;

export type LoadingScreenPhase = "hidden" | "shown" | "leaving";

export type LoadingScreenState = {
  phase: LoadingScreenPhase;
  // The newest request's line, such as "Loading your resumes". Kept while it fades out.
  detail: string | null;
};

export type LoadingScreenOptions = {
  delayMs?: number;
  minShownMs?: number;
  fadeMs?: number;
  now?: () => number;
};

export type LoadingScreen = {
  // Shows the screen until the returned function is called. A newer request's detail wins.
  request: (detail?: string | null) => () => void;
  getState: () => LoadingScreenState;
  subscribe: (listener: () => void) => () => void;
};

export function createLoadingScreen(options: LoadingScreenOptions = {}): LoadingScreen {
  const delayMs = options.delayMs ?? LOADING_SCREEN_TIMING.delayMs;
  const minShownMs = options.minShownMs ?? LOADING_SCREEN_TIMING.minShownMs;
  const fadeMs = options.fadeMs ?? LOADING_SCREEN_TIMING.fadeMs;
  const now = options.now ?? (() => Date.now());

  const open = new Map<number, string | null>();
  const listeners = new Set<() => void>();
  let nextId = 0;
  let state: LoadingScreenState = { phase: "hidden", detail: null };
  let shownAt = 0;
  // At most one pending step at a time: the delay before showing, the minimum hold, or the fade.
  let timer: ReturnType<typeof setTimeout> | undefined;

  function set(next: LoadingScreenState) {
    if (next.phase === state.phase && next.detail === state.detail) return;
    state = next;
    for (const listener of listeners) listener();
  }

  function wait(ms: number, then: () => void) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      then();
    }, ms);
  }

  function latestDetail(): string | null {
    let detail: string | null = null;
    for (const value of open.values()) if (value) detail = value;
    return detail ?? state.detail;
  }

  function update() {
    const wanted = open.size > 0;
    if (wanted) {
      if (state.phase === "hidden") {
        if (timer === undefined) {
          wait(delayMs, () => {
            if (open.size === 0) return;
            shownAt = now();
            set({ phase: "shown", detail: latestDetail() });
          });
        }
        return;
      }
      // Back before it finished leaving (the next page asked for it): it stays up.
      clearTimeout(timer);
      timer = undefined;
      set({ phase: "shown", detail: latestDetail() });
      return;
    }

    if (state.phase === "hidden") {
      clearTimeout(timer);
      timer = undefined;
      return;
    }
    if (state.phase === "leaving") return;
    const fade = () => {
      set({ phase: "leaving", detail: state.detail });
      wait(fadeMs, () => set({ phase: "hidden", detail: null }));
    };
    const held = minShownMs - (now() - shownAt);
    if (held > 0) wait(held, fade);
    else fade();
  }

  return {
    request(detail = null) {
      const id = ++nextId;
      open.set(id, detail);
      update();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        open.delete(id);
        update();
      };
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
