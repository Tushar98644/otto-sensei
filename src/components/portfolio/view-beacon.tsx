"use client";

import { useEffect } from "react";

// The page is served from the cache, so the server never sees a visit; the browser reports one
// instead. Once per tab per page, so refreshing adds nothing. Nothing about the visitor is sent.
export function PortfolioViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `otto:portfolio-viewed:${slug}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
    } catch {
      // Storage blocked: count it anyway; the server caps each page per hour.
    }
    const send = () => {
      try {
        window.sessionStorage.setItem(key, "1");
      } catch {
        // As above.
      }
      void fetch("/api/portfolio/views", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    };
    // A page the browser prerendered ahead of a click hasn't been seen yet.
    const doc = document as Document & { prerendering?: boolean };
    if (doc.prerendering) {
      doc.addEventListener("prerenderingchange", send, { once: true });
      return () => doc.removeEventListener("prerenderingchange", send);
    }
    send();
  }, [slug]);
  return null;
}
