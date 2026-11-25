"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";

// Ported from JoaccoG/portfolio-v2 (MIT, see ./LICENSE.txt).

function readTime(timeZone: string, locale: Locale): string | null {
  try {
    return formatFor(locale).date(new Date(), { timeZone, hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

export function LocalTime({ timeZone, locale }: { timeZone: string; locale: Locale }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setTime(readTime(timeZone, locale));
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [timeZone, locale]);

  return <span className="value">{time ?? "--:--"}</span>;
}
