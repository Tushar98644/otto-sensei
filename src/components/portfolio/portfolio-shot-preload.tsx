"use client";

import { useEffect } from "react";
import { preload } from "react-dom";

export function whenLoadedAndIdle(task: () => void): () => void {
  let cancelIdle = () => {};
  const idle = () => {
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(task, { timeout: 2000 });
      cancelIdle = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(task, 200);
      cancelIdle = () => window.clearTimeout(handle);
    }
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    window.removeEventListener("load", idle);
    cancelIdle();
  };
}

export type PreloadWhenIdleProps = { href: string; imageSrcSet?: string; imageSizes?: string };

// Asked for from the browser, after load: a server hint would travel in every prefetch of the page.
export function PreloadWhenIdle({ href, imageSrcSet, imageSizes }: PreloadWhenIdleProps) {
  useEffect(
    () =>
      whenLoadedAndIdle(() =>
        preload(href, { as: "image", imageSrcSet, imageSizes, fetchPriority: "low" }),
      ),
    [href, imageSrcSet, imageSizes],
  );
  return null;
}
