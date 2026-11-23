import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentAccount } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { mePayload } from "./payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const account = await getCurrentAccount();
    return ok(await mePayload(account?.user ?? null, account?.billing), { headers: NO_STORE });
  } catch (error) {
    log.error("me.failed", error);
    return fail("server_error", "Couldn't load your account. Please try again.", 500, NO_STORE);
  }
}
