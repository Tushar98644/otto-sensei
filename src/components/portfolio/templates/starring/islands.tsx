"use client";

import { useEffect, useRef } from "react";

// Ported from pipozzz/starring (MIT, see ./LICENSE.txt): reveal on scroll, count-up numbers, progress bar.

function scroller(node: HTMLElement): HTMLElement | null {
  for (let at = node.parentElement; at; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at);
    if (/(auto|scroll)/.test(overflowY) && at.scrollHeight > at.clientHeight) return at;
  }
  return null;
}

const NUMBER = /^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/;

function countUp(node: HTMLElement) {
  const text = node.textContent ?? "";
  const match = NUMBER.exec(text);
  if (!match) return;
  const [, head = "", digits = "", tail = ""] = match;
  const target = Number(digits.replace(/,/g, ""));
  const places = digits.split(".")[1]?.length ?? 0;
  const grouped = digits.includes(",");
  const format = (value: number) => {
    const fixed = value.toFixed(places);
    return grouped
      ? Number(fixed).toLocaleString("en-US", { minimumFractionDigits: places })
      : fixed;
  };
  const start = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - start) / 1400);
    node.textContent = k < 1 ? `${head}${format(target * (1 - (1 - k) ** 4))}${tail}` : text;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function Stage() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".pf-starring");
    if (!root || root.closest("[inert], [data-pf-still]")) return;
    const bar = root.querySelector<HTMLElement>(".progress");
    const box = scroller(root);
    const target: HTMLElement | Window = box ?? window;
    const onScroll = () => {
      const top = box ? box.scrollTop : window.scrollY;
      const max = box
        ? box.scrollHeight - box.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      bar?.style.setProperty("--p", String(max > 0 ? Math.min(1, top / max) : 0));
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return () => target.removeEventListener("scroll", onScroll);

    const fold = window.innerHeight * 0.9;
    const shows = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "true");
          shows.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );
    for (const item of root.querySelectorAll<HTMLElement>(".reveal")) {
      if (item.getBoundingClientRect().top < fold) continue;
      item.setAttribute("data-shown", "false");
      shows.observe(item);
    }
    const counts = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          countUp(entry.target as HTMLElement);
          counts.unobserve(entry.target);
        }
      },
      { threshold: 0.6 },
    );
    for (const item of root.querySelectorAll<HTMLElement>("[data-count]")) {
      if (item.getBoundingClientRect().top >= fold) counts.observe(item);
    }
    return () => {
      target.removeEventListener("scroll", onScroll);
      shows.disconnect();
      counts.disconnect();
    };
  }, []);

  return <span ref={ref} hidden />;
}
