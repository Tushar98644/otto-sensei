"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// After HamishMW/portfolio's ThemeProvider and window hooks (MIT, see ./LICENSE.txt).

export type ReelMode = "ssr" | "live" | "lite" | "still";
export type ReelTheme = "dark" | "light";
type ReelSize = { width: number; height: number };

type ReelState = {
  theme: ReelTheme;
  toggleTheme: () => void;
  mode: ReelMode;
  size: ReelSize;
  reduceMotion: boolean;
};

export function reelMode(root: Element, reduceMotion: boolean): ReelMode {
  if (root.closest("[data-pf-still]")) return "still";
  // Reduced motion gets the pre-rendered stills, the same picture the canvases would hold, without three.js.
  return reduceMotion || root.closest("[inert]") ? "lite" : "live";
}

export const keepSize = (current: ReelSize, next: ReelSize): ReelSize =>
  current.width === next.width && current.height === next.height ? current : next;

const ReelContext = createContext<ReelState>({
  theme: "dark",
  toggleTheme: () => {},
  mode: "ssr",
  size: { width: 1280, height: 800 },
  reduceMotion: false,
});

export const useReel = () => useContext(ReelContext);

const THEME_KEY = "pf-reel-theme";

export function ReelRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ReelTheme>("dark");
  const [mode, setMode] = useState<ReelMode>("ssr");
  const [size, setSize] = useState<ReelSize>({ width: 1280, height: 800 });
  const [reduceMotion, setReduceMotion] = useState(false);

  // Layout effect, so the first painted frame already has the right theme and mode.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMode(reelMode(root, motion.matches));
    setReduceMotion(motion.matches);
    try {
      if (window.localStorage.getItem(THEME_KEY) === "light") setTheme("light");
    } catch {}

    const onMotion = () => {
      setMode(reelMode(root, motion.matches));
      setReduceMotion(motion.matches);
    };
    motion.addEventListener("change", onMotion);

    const measure = () => {
      const next = { width: root.clientWidth, height: screen.current?.offsetHeight || innerHeight };
      setSize((current) => keepSize(current, next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    if (screen.current) observer.observe(screen.current);
    return () => {
      motion.removeEventListener("change", onMotion);
      observer.disconnect();
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme, mode, size, reduceMotion }),
    [theme, toggleTheme, mode, size, reduceMotion],
  );

  return (
    <ReelContext.Provider value={value}>
      <div ref={ref} className="pf-reel" data-theme={theme} data-mode={mode}>
        <div ref={screen} className="screen-ruler" aria-hidden />
        {children}
      </div>
    </ReelContext.Provider>
  );
}
