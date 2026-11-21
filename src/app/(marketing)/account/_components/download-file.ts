"use client";

import { ApiClientError } from "@/lib/api/client";
import type { ApiErrorBody } from "@/lib/api/types";

const FILE_NAME = /filename="([^"]+)"/;

// Fetched rather than linked, so a refusal shows its message instead of saving an error page as a file.
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiClientError("network_error", "Can't reach the server. Check your connection.", 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiClientError(
      body?.error?.code ?? "server_error",
      body?.error?.message ?? "Something went wrong. Please try again.",
      res.status,
    );
  }
  const blob = await res.blob();
  const name = FILE_NAME.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers start the download after click() returns, and revoking at once can cancel it.
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
