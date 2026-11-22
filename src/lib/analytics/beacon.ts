import { z } from "zod";
import { EMAIL_CAMPAIGNS, TRAFFIC_UTM_KEYS } from "./landing";
import type { ClientEvent } from "./events";
import type { BatchEvent } from "./server";

// What the browser's first-party beacon may say: page templates, counts and flags, never a raw address.

const CLIENT_EVENTS = [
  "landing_viewed",
  "resume_imported",
  "recruiter_view_seen",
  "screener_viewed",
  "pdf_downloaded",
  "docx_downloaded",
  "upgrade_clicked",
  "signup_started",
] as const satisfies readonly ClientEvent[];

export const VITALS = ["LCP", "INP", "CLS", "TTFB"] as const;

const Route = z
  .string()
  .max(200)
  .regex(/^\/[^\s?#@]*$/);
const Id = z.uuid();
const Utm = z.strictObject(
  Object.fromEntries(TRAFFIC_UTM_KEYS.map((key) => [key, z.string().max(100).optional()])),
);
const Prop = z.union([z.string().max(40), z.number().finite(), z.boolean()]);

const View = z.strictObject({
  type: z.literal("view"),
  route: Route,
  device: z.enum(["Mobile", "Tablet", "Desktop"]),
  referrer: z
    .string()
    .max(253)
    .regex(/^[a-z0-9.-]+$/i)
    .optional(),
  utm: Utm.optional(),
  timeZone: z.string().min(1).max(64).optional(),
  email: z
    .strictObject({
      campaign: z.enum(EMAIL_CAMPAIGNS),
      link: z
        .string()
        .regex(/^[a-z0-9_]{1,40}$/)
        .optional(),
    })
    .optional(),
});

const Event = z.strictObject({
  type: z.literal("event"),
  route: Route,
  event: z.enum(CLIENT_EVENTS),
  props: z
    .record(z.string().regex(/^[a-z_]{1,40}$/), Prop)
    .refine((props) => Object.keys(props).length <= 8)
    .optional(),
});

const Vitals = z.strictObject({
  type: z.literal("vitals"),
  route: Route,
  metrics: z.strictObject(
    Object.fromEntries(VITALS.map((name) => [name, z.number().finite().min(0).optional()])),
  ),
});

export const BeaconSchema = z.strictObject({
  visitor: Id.optional(),
  linked: z.boolean().optional(),
  session: Id.optional(),
  items: z
    .array(z.discriminatedUnion("type", [View, Event, Vitals]))
    .min(1)
    .max(20),
});

export type Beacon = z.input<typeof BeaconSchema>;
export type BeaconItem = Beacon["items"][number];
type ParsedItem = z.output<typeof BeaconSchema>["items"][number];

export type BeaconContext = {
  distinctId: string;
  anonymous: boolean;
  session?: string;
  origin: string;
};

function pageProps(route: string, { session, origin, anonymous }: BeaconContext) {
  return {
    $current_url: `${origin}${route}`,
    $host: new URL(origin).host,
    $pathname: route,
    ...(session ? { $session_id: session } : {}),
    ...(anonymous ? { $process_person_profile: false } : {}),
  };
}

// The names PostHog's web analytics and web vitals views read, so they work without posthog-js.
export function beaconEvent(item: ParsedItem, context: BeaconContext): BatchEvent {
  const base = { distinctId: context.distinctId };
  const page = pageProps(item.route, context);
  switch (item.type) {
    case "view":
      return {
        ...base,
        event: "$pageview",
        properties: {
          ...page,
          $device_type: item.device,
          ...(item.referrer
            ? { $referrer: `https://${item.referrer}`, $referring_domain: item.referrer }
            : { $referrer: "$direct", $referring_domain: "$direct" }),
          ...item.utm,
        },
      };
    case "event":
      return { ...base, event: item.event, properties: { ...item.props, ...page } };
    case "vitals": {
      const metrics: Record<string, number> = {};
      for (const name of VITALS) {
        const value = item.metrics[name];
        if (value !== undefined) metrics[`$web_vitals_${name}_value`] = value;
      }
      return { ...base, event: "$web_vitals", properties: { ...metrics, ...page } };
    }
  }
}
