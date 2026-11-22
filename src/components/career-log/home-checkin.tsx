"use client";

import { checkinHomeCard } from "@/components/dashboard/page-code";
import { useNotifications } from "@/components/notifications/use-notifications";
import { useNow } from "@/components/studio/use-now";
import { Lazy } from "@/components/ui/lazy";
import { homeCheckinMonth } from "@/lib/career-log/links";

// On the check-in day the bell's note brings a card to Home; its code loads only then, or at idle with the page's parts.
export function HomeCheckin() {
  const bell = useNotifications();
  const now = useNow();
  if (bell.status !== "ready" || now === 0) return null;
  const month = homeCheckinMonth(bell.items, now);
  if (!month) return null;
  return <Lazy loader={checkinHomeCard} wanted props={{ month }} />;
}
