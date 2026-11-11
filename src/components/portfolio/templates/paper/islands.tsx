"use client";

import { useEffect, useState } from "react";

// Ported from CaliCastle/cali.so (application code MIT, see ./LICENSE.txt).

function partsIn(timeZone: string, date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "shortOffset",
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const hour = Number(get("hour")) % 12;
    const minute = Number(get("minute"));
    const offset = get("timeZoneName").replace("GMT", "UTC") || "UTC";
    return {
      hour,
      minute,
      label: `${get("hour")}:${get("minute")} ${get("dayPeriod")}`,
      offset: offset === "UTC" ? "UTC+0" : offset,
    };
  } catch {
    return null;
  }
}

export function FooterClock({ timeZone, place }: { timeZone: string; place: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  const parts = now ? partsIn(timeZone, now) : null;
  const hourAngle = parts ? (parts.hour + parts.minute / 60) * 30 : 0;
  const minuteAngle = parts ? parts.minute * 6 : 0;

  return (
    <div className="stamp">
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <circle className="ring" cx="16" cy="16" r="14.5" />
        <path className="ticks" d="M16 3.5v2M28.5 16h-2M16 28.5v-2M3.5 16h2" />
        <line
          className="hour"
          x1="16"
          y1="16"
          x2="16"
          y2="9.5"
          transform={`rotate(${hourAngle} 16 16)`}
        />
        <line
          className="minute"
          x1="16"
          y1="16"
          x2="16"
          y2="6.75"
          transform={`rotate(${minuteAngle} 16 16)`}
        />
        <circle className="pin" cx="16" cy="16" r="1" />
      </svg>
      <span className="readout">
        <span>{parts?.offset ?? "UTC"}</span>
        <time
          aria-label={parts ? `Local time in ${place}: ${parts.label}` : `Local time in ${place}`}
        >
          {parts?.label ?? "--:--"}
        </time>
      </span>
    </div>
  );
}
