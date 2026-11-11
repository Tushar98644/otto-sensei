import { isServer, QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { signedInUserId, subscribeToMe } from "@/components/account/use-me";
import { isApiError } from "@/lib/api/client";

const MINUTE = 60_000;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  return !isApiError(error) || error.code === "network_error" || error.status >= 500;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: MINUTE,
        gcTime: 30 * MINUTE,
        retry: shouldRetry,
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

function clearOnAccountChange(client: QueryClient) {
  let last = signedInUserId();
  subscribeToMe(() => {
    const current = signedInUserId();
    if (last !== null && current !== last) client.clear();
    last = current;
  });
}
