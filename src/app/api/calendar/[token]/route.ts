import { NO_STORE } from "@/lib/api/respond";
import { feedFor, feedOwner } from "@/lib/calendar/records";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };

// The link itself is the key: calendar apps send no cookies, and nothing here is cached.
const HEADERS = {
  ...NO_STORE,
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function notFound(): Response {
  return new Response("This calendar link isn't valid any more.\n", {
    status: 404,
    headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function feed({ params }: Context, withBody: boolean): Promise<Response> {
  try {
    const { token } = await params;
    const userId = await feedOwner(token.replace(/\.ics$/, ""));
    if (!userId) return notFound();
    const body = await feedFor(userId);
    return new Response(withBody ? body : null, {
      headers: {
        ...HEADERS,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="otto-interviews.ics"',
      },
    });
  } catch (error) {
    log.error("calendar.feed_failed", error);
    return new Response("Couldn't read this calendar. Please try again.\n", {
      status: 500,
      headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

export function GET(_req: Request, context: Context): Promise<Response> {
  return feed(context, true);
}

export function HEAD(_req: Request, context: Context): Promise<Response> {
  return feed(context, false);
}
