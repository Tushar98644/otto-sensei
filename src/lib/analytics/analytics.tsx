"use client";

import { useParams, usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useLayoutEffect, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { setErrorUser } from "@/lib/observability/browser";
import { sentryEnabled } from "@/lib/observability/config";
import { isAppPage } from "@/lib/observability/pages";
import { analyticsEnabled, setPageRoute, trackPageView } from "./client";
import { routeTemplate } from "./route-template";
import { startVitals } from "./vitals";

const noChanges = () => () => {};

export function Analytics() {
  const enabled = useSyncExternalStore(noChanges, analyticsEnabled, () => false);
  const pathname = usePathname();
  const route = routeTemplate(pathname, useParams());

  useLayoutEffect(() => setPageRoute(route), [route]);

  const view = useEffectEvent(() => {
    trackPageView(route, pathname);
    startVitals(route);
  });

  useEffect(() => {
    if (enabled) view();
  }, [enabled, pathname]);

  return sentryEnabled("browser") && isAppPage(pathname) ? <ErrorUser /> : null;
}

function ErrorUser() {
  const { me } = useMe();
  // A failed /api/me leaves `me` null: unknown, not signed out, so the id stays as it was.
  const known = me !== null;
  const id = me?.user?.id ?? null;

  useEffect(() => {
    if (known) setErrorUser(id);
  }, [known, id]);

  return null;
}
