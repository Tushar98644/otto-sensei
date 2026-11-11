"use client";

import { useEffect } from "react";
import { readItem, writeItem } from "@/lib/browser-storage";

// The page is cached, so the browser reports the visit. Nothing about the visitor is sent.
export function PortfolioViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `otto:portfolio-viewed:${slug}`;
    if (readItem(key, "session")) return;
    const send = () => {
      writeItem(key, "1", "session");
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
