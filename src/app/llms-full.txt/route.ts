import { billingOffer } from "@/lib/billing/intervals";
import { appUrl } from "@/lib/env";
import { llmsFullTxt } from "./full-text";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(llmsFullTxt(appUrl(), billingOffer()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
