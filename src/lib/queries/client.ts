import { isServer, QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { signedInUserId, subscribeToMe } from "@/components/account/use-me";
import { isApiError } from "@/lib/api/client";

// One TanStack Query cache per tab, shared by dashboard and studio. Hooks pass the client
// explicitly (useAppQueryClient) rather than reading a provider, so a component works on any page.

const MINUTE = 60_000;

/** A 4xx won't change by asking again; anything else gets one quiet retry. */
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

// A module-level client on the server would outlive the request and collect every visitor's keys.
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserClient) {
    const client = makeQueryClient();
    clearOnAccountChange(client);
    browserClient = client;
  }
  return browserClient;
}

export function useAppQueryClient(): QueryClient {
  const [client] = useState(getQueryClient);
  return client;
}

// For shared computers. Keys carry the account id too, so nothing is read across accounts
// meanwhile.
function clearOnAccountChange(client: QueryClient) {
  let last = signedInUserId();
  subscribeToMe(() => {
    const current = signedInUserId();
    if (last !== null && current !== last) client.clear();
    last = current;
  });
}
