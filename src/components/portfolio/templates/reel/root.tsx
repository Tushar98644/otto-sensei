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

type ReelState = {
  theme: ReelTheme;
  toggleTheme: () => void;
  mode: ReelMode;
  size: { width: number; height: number };
  reduceMotion: boolean;
};

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
  const [size, setSize] = useState({ width: 1280, height: 800 });
  const [reduceMotion, setReduceMotion] = useState(false);

  // Layout effect, so the first painted frame already has the right theme and mode.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    setMode(root.closest("[data-pf-still]") ? "still" : root.closest("[inert]") ? "lite" : "live");
    try {
      if (window.localStorage.getItem(THEME_KEY) === "light") setTheme("light");
    } catch {}

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduceMotion(motion.matches);
    onMotion();
    motion.addEventListener("change", onMotion);

    const measure = () =>
      setSize({ width: root.clientWidth, height: screen.current?.offsetHeight || innerHeight });
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
