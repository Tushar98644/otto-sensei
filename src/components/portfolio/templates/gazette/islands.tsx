"use client";

import { useEffect, useState } from "react";

// Ported from JoaccoG/portfolio-v2 (MIT, see ./LICENSE.txt).

function readTime(timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  } catch {
    return null;
  }
}

export function LocalTime({ timeZone }: { timeZone: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setTime(readTime(timeZone));
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [timeZone]);

  return <span className="value">{time ?? "--:--"}</span>;
}
