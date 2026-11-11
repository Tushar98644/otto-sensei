"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useReel } from "./root";

// After HamishMW/portfolio's hooks and Transition (MIT, see ./LICENSE.txt).

export function useInViewport(
  elementRef: RefObject<Element | null>,
  unobserveOnIntersect = false,
  options: IntersectionObserverInit = {},
  shouldObserve = true,
): boolean {
  const [intersect, setIntersect] = useState(false);
  const [isUnobserved, setIsUnobserved] = useState(false);
  const { root, rootMargin, threshold } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setIntersect(entry.isIntersecting);
        if (entry.isIntersecting && unobserveOnIntersect) {
          observer.unobserve(entry.target);
          setIsUnobserved(true);
        }
      },
      { root, rootMargin, threshold },
    );
    if (!isUnobserved && shouldObserve) observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, unobserveOnIntersect, root, rootMargin, threshold, isUnobserved, shouldObserve]);

  return intersect;
}

export function useInterval(callback: () => void, delay: number | null, reset?: unknown) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });
  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => saved.current(), delay);
    return () => window.clearInterval(id);
  }, [delay, reset]);
}

export function useSectionVisible(ref: RefObject<Element | null>): boolean {
  const { mode } = useReel();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const section = ref.current;
    if (!section || mode === "ssr" || mode === "still" || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setSeen(true);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [ref, mode, seen]);
  return seen || mode === "still";
}

export type TransitionStatus = "entering" | "entered" | "exiting" | "exited";
type Timeout = number | { enter: number; exit: number };
type RenderProps = { visible: boolean; status: TransitionStatus };

export function Transition({
  in: show,
  unmount = false,
  initial = true,
  timeout = 0,
  children,
}: {
  in: boolean;
  unmount?: boolean;
  initial?: boolean;
  timeout?: Timeout;
  children: (props: RenderProps) => ReactNode;
}) {
  const { mode } = useReel();
  const [present, setPresent] = useState(show || !unmount);
  const [generation, setGeneration] = useState(0);

  if (show && !present) {
    setPresent(true);
    setGeneration(generation + 1);
  }

  if (!present) return null;
  if (mode === "still") {
    if (!show && unmount) return null;
    return children({ visible: show, status: show ? "entered" : "exited" });
  }
  return (
    <TransitionContent
      key={generation}
      show={show}
      isPresent={show || !unmount}
      initial={initial}
      timeout={timeout}
      onRemove={() => setPresent(false)}
    >
      {children}
    </TransitionContent>
  );
}

function TransitionContent({
  show,
  isPresent,
  initial,
  timeout,
  onRemove,
  children,
}: {
  show: boolean;
  isPresent: boolean;
  initial: boolean;
  timeout: Timeout;
  onRemove: () => void;
  children: (props: RenderProps) => ReactNode;
}) {
  const { mode } = useReel();
  const [status, setStatus] = useState<TransitionStatus>(initial ? "exited" : "entered");
  const [hasEntered, setHasEntered] = useState(!initial);
  const enterTimer = useRef(0);
  const exitTimer = useRef(0);
  const enterTimeout = typeof timeout === "object" ? timeout.enter : timeout;
  const exitTimeout = typeof timeout === "object" ? timeout.exit : timeout;
  const removeRef = useRef(onRemove);
  useEffect(() => {
    removeRef.current = onRemove;
  });

  useEffect(() => {
    if (mode === "ssr" || hasEntered || !show) return;
    const start = window.setTimeout(() => {
      window.clearTimeout(exitTimer.current);
      setHasEntered(true);
      setStatus("entering");
      enterTimer.current = window.setTimeout(() => setStatus("entered"), enterTimeout);
    }, 0);
    return () => window.clearTimeout(start);
  }, [mode, hasEntered, show, enterTimeout]);

  useEffect(() => {
    if (mode === "ssr" || (isPresent && show) || !hasEntered) return;
    const start = window.setTimeout(() => {
      window.clearTimeout(enterTimer.current);
      setStatus("exiting");
      exitTimer.current = window.setTimeout(() => {
        setStatus("exited");
        if (!isPresent) removeRef.current();
      }, exitTimeout);
    }, 0);
    return () => window.clearTimeout(start);
  }, [mode, isPresent, show, hasEntered, exitTimeout]);

  useEffect(
    () => () => {
      window.clearTimeout(enterTimer.current);
      window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const visible = hasEntered && show ? isPresent : false;
  return children({ visible, status });
}
