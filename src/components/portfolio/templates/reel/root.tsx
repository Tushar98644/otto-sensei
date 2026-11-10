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

// Hamish's ThemeProvider and the window facts his components read (useWindowSize,
// useReducedMotion), for a page that may sit in a preview column instead of a window.
//
// mode says where the page is drawn:
//   ssr   the server's markup and the first client render, before any of this has run
//   live  the public page or the full preview: everything moves, three.js loads
//   lite  the editor's inert preview: the same choreography, still frames instead of WebGL
//   still a template card (data-pf-still): the finished state at once, nothing moving

export type ReelMode = "ssr" | "live" | "lite" | "still";
export type ReelTheme = "dark" | "light";

type ReelState = {
  theme: ReelTheme;
  toggleTheme: () => void;
  mode: ReelMode;
  // The page's width and one screen's height (the window, or the preview's box).
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
  // Dark first, like the original's cookie default; a reader's switch is kept per browser.
  const [theme, setTheme] = useState<ReelTheme>("dark");
  const [mode, setMode] = useState<ReelMode>("ssr");
  const [size, setSize] = useState({ width: 1280, height: 800 });
  const [reduceMotion, setReduceMotion] = useState(false);

  // A layout effect, so the first frame the reader sees already has the right theme and mode and
  // nothing starts animating under the wrong one.
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
