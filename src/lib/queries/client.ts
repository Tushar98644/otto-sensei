import { isServer, QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { signedInUserId, subscribeToMe } from "@/components/account/use-me";
import { isApiError } from "@/lib/api/client";

// The signed-in app's server data (TanStack Query). One cache per tab, shared by the dashboard and
// the studio, so whatever one page loaded shows at once on the next. Hooks pass the client
// explicitly (useAppQueryClient) instead of reading a provider, so a component works on any page
// it lands on.

const MINUTE = 60_000;

/** A lost connection or a server error gets one quiet retry; a 4xx answer won't change by asking again. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  return !isApiError(error) || error.code === "network_error" || error.status >= 500;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: MINUTE,
        // Long enough that coming back to a page later in the session still finds its data.
        gcTime: 30 * MINUTE,
        retry: shouldRetry,
        // A tab switch to a job board and back is the usual rhythm; it shouldn't reload every list.
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserClient: QueryClient | null = null;

// The server render gets a new client each time: a module-level one there would outlive the
// request and collect every visitor's query keys.
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserClient) {
    const client = makeQueryClient();
    clearOnAccountChange(client);
    browserClient = client;
  }
  return browserClient;
}

/** For components: the tab's client in the browser, one per component during the server render. */
export function useAppQueryClient(): QueryClient {
  const [client] = useState(getQueryClient);
  return client;
}

// Signing out (or in as someone else) drops everything the last account loaded, for shared
// computers. Keys carry the account id too, so nothing is ever read across accounts meanwhile.
function clearOnAccountChange(client: QueryClient) {
  let last = signedInUserId();
  subscribeToMe(() => {
    const current = signedInUserId();
    if (last !== null && current !== last) client.clear();
    last = current;
  });
}
