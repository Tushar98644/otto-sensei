"use client";

import { Lazy, lazyComponent } from "@/components/ui/lazy";
import { useNotifications } from "@/components/notifications/use-notifications";
import { useNow } from "@/components/studio/use-now";
import { monthOfCheckinLink } from "@/lib/career-log/links";
import { DAY_MS } from "@/lib/time";

// The Home card stays this long after the check-in rings, unless the month is written first.
const SHOWN_FOR_MS = 14 * DAY_MS;

const card = lazyComponent(() => import("./checkin-home-card").then((m) => m.CheckinHomeCard));

// On the check-in day the bell's note brings a card to Home; its code loads only then.
export function HomeCheckin() {
  const bell = useNotifications();
  const now = useNow();
  if (bell.status !== "ready" || now === 0) return null;
  const note = bell.items.find(
    (item) => item.kind === "career_checkin" && now - item.createdAt < SHOWN_FOR_MS,
  );
  const month = note ? monthOfCheckinLink(note.link) : null;
  if (!month) return null;
  return <Lazy loader={card} wanted props={{ month }} />;
}
