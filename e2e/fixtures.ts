import { test as base, expect, type BrowserContext } from "@playwright/test";
import type { SessionUser } from "@/lib/auth/types";
import { signIn } from "./helpers";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Dev-server messages that patch, refresh or reload an open page after a file under the repo changes.
const PAGE_UPDATES = new Set([
  "building",
  "built",
  "turbopack-message",
  "serverComponentChanges",
  "staticParamsChanged",
  "reloadPage",
  "addedPage",
  "removedPage",
]);

function randomIp(): string {
  const octet = () => Math.floor(Math.random() * 256);
  return `10.${octet()}.${octet()}.${octet()}`;
}

function messageType(message: string | Buffer): string | undefined {
  if (typeof message !== "string") return undefined;
  try {
    return (JSON.parse(message) as { type?: string }).type;
  } catch {
    return undefined;
  }
}

// Pages keep the code they loaded; the socket stays connected because React's dev debug data comes over it.
export async function holdDevUpdates(context: BrowserContext): Promise<void> {
  await context.routeWebSocket(/\/_next\/hmr\b/, (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (!PAGE_UPDATES.has(messageType(message) ?? "")) socket.send(message);
    });
  });
}

// Aborts every browser request that leaves this machine and returns the list, for a check when the test ends.
export async function blockOutsideHosts(context: BrowserContext): Promise<string[]> {
  const leaks: string[] = [];
  await context.route(
    (url) => !LOCAL_HOSTS.has(url.hostname),
    (route) => {
      leaks.push(route.request().url());
      return route.abort("blockedbyclient");
    },
  );
  return leaks;
}

export function clientIpHeader(): Record<string, string> {
  return { "x-forwarded-for": randomIp() };
}

type Fixtures = {
  // A fresh account, already signed in on `page` (and `page.request`); only made when a test asks for it.
  user: SessionUser;
  localOnly: void;
  steadyPages: void;
};

export const test = base.extend<Fixtures>({
  // Each test gets its own client IP, so the per-IP sign-in and upload limits never carry over.
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    await use({ ...clientIpHeader(), ...extraHTTPHeaders });
  },
  localOnly: [
    async ({ context }, use) => {
      const leaks = await blockOutsideHosts(context);
      await use();
      expect(leaks, "the browser asked for something outside localhost").toEqual([]);
    },
    { auto: true },
  ],
  steadyPages: [
    async ({ context }, use) => {
      await holdDevUpdates(context);
      await use();
    },
    { auto: true },
  ],
  user: async ({ page }, use) => {
    await use(await signIn(page));
  },
});

export { expect };
