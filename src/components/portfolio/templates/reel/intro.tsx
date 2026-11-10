"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { DecoderText } from "./decoder-text";
import { Transition, useInterval } from "./motion";
import { useReel } from "./root";
import { scrollToHash } from "./scroll";

// HamishMW/portfolio routes/home/intro.jsx: the name decoding out of katakana, the role wiping in
// with a line after it, the next discipline wiping in under it every five seconds, the displacement
// sphere behind, and the scroll indicators. Switching theme plays it all again, as in the original.

const DisplacementSphere = lazy(() => import("./gl/displacement-sphere"));

export function Intro({
  id,
  name,
  role,
  disciplines,
  label,
  titleScale,
  scrollTarget,
}: {
  id: string;
  name: string;
  role: string;
  disciplines: string[];
  // The title for screen readers: "Designer + Developer, and Animator".
  label: string;
  titleScale: number;
  // The first project's section, when there is one.
  scrollTarget: string | null;
}) {
  const { theme, mode, reduceMotion } = useReel();
  const sectionRef = useRef<HTMLElement>(null);
  const [disciplineIndex, setDisciplineIndex] = useState(0);
  const [shownTheme, setShownTheme] = useState(theme);
  const [scrollIndicatorHidden, setScrollIndicatorHidden] = useState(false);
  const [sphereFailed, setSphereFailed] = useState(false);
  const titleId = `${id}-title`;
  const currentDiscipline = disciplines[disciplineIndex];

  // A new theme starts the words over.
  if (shownTheme !== theme) {
    setShownTheme(theme);
    setDisciplineIndex(0);
  }

  useInterval(
    () => setDisciplineIndex((disciplineIndex + 1) % Math.max(disciplines.length, 1)),
    mode === "live" || mode === "lite" ? 5000 : null,
    theme,
  );

  useEffect(() => {
    const intro = sectionRef.current;
    if (!intro || mode === "ssr" || mode === "still") return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrollIndicatorHidden(!entry?.isIntersecting),
      { rootMargin: "-100% 0px 0px 0px" },
    );
    observer.observe(intro);
    return () => observer.disconnect();
  }, [mode]);

  const handleScrollClick = (event: MouseEvent<HTMLAnchorElement>) =>
    scrollToHash(event, reduceMotion);

  return (
    <section
      className="intro section"
      ref={sectionRef}
      id={id}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <Transition in key={theme} timeout={3000}>
        {({ visible, status }) => (
          <>
            {mode === "live" && !sphereFailed ? (
              <Suspense>
                <DisplacementSphere onFail={() => setSphereFailed(true)} />
              </Suspense>
            ) : null}
            <div
              className="sphere-still"
              aria-hidden
              data-visible={visible}
              data-failed={sphereFailed}
            >
              <div className="sphere-still-image" />
            </div>
            <header className="intro-text">
              <h1 className="intro-name" data-visible={visible} id={titleId}>
                <DecoderText text={name} delay={500} />
              </h1>
              <h2
                className="heading intro-title"
                data-level="0"
                style={{ "--title-scale": titleScale } as CSSProperties}
              >
                <span className="visually-hidden">{label}</span>
                <span aria-hidden className="intro-row">
                  <span
                    className="intro-word"
                    data-status={status}
                    style={{ "--delay": "200ms" } as CSSProperties}
                  >
                    {role}
                  </span>
                  <span className="intro-line" data-status={status} />
                </span>
                {disciplines.length > 0 ? (
                  <span className="intro-row">
                    {disciplines.map((item) => (
                      <Transition
                        unmount
                        in={item === currentDiscipline}
                        timeout={{ enter: 3000, exit: 2000 }}
                        key={item}
                      >
                        {({ status: wordStatus }) => (
                          <span
                            aria-hidden
                            className="intro-word"
                            data-plus
                            data-status={wordStatus}
                            style={{ "--delay": "600ms" } as CSSProperties}
                          >
                            {item}
                          </span>
                        )}
                      </Transition>
                    ))}
                  </span>
                ) : null}
              </h2>
            </header>
            {scrollTarget ? (
              <>
                <a
                  href={scrollTarget}
                  className="intro-scroll"
                  data-status={status}
                  data-hidden={scrollIndicatorHidden}
                  onClick={handleScrollClick}
                >
                  <span className="visually-hidden">Scroll to projects</span>
                </a>
                <a
                  href={scrollTarget}
                  className="intro-mscroll"
                  data-status={status}
                  data-hidden={scrollIndicatorHidden}
                  onClick={handleScrollClick}
                >
                  <span className="visually-hidden">Scroll to projects</span>
                  <svg aria-hidden stroke="currentColor" width="43" height="15" viewBox="0 0 43 15">
                    <path d="M1 1l20.5 12L42 1" strokeWidth="2" fill="none" />
                  </svg>
                </a>
              </>
            ) : null}
          </>
        )}
      </Transition>
    </section>
  );
}
