import { fail, NO_STORE } from "@/lib/api/respond";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { BillingError } from "@/lib/billing";
import { invoiceFor } from "@/lib/billing/history";
import { log } from "@/lib/log";
import { limitReads } from "../../read-limit";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ paymentId: string }> };

const NOT_FOUND = "We couldn't find that invoice.";

// Another account's payment gets the same 404 as a missing one, so ids can't be probed.
export const GET = withApiLocale(async function GET(
  req: Request,
  { params }: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to download your invoices.", 401, NO_STORE);
    const { paymentId } = await params;
    const limited = await limitReads("invoice", user.id);
    if (limited) return limited;
    const invoice = await invoiceFor(user, paymentId);
    if (!invoice) return fail("not_found", NOT_FOUND, 404, NO_STORE);
    return new Response(invoice.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof BillingError) {
      return fail(
        "billing_unavailable",
        "We couldn't get that invoice right now. Please try again in a minute.",
        503,
        NO_STORE,
      );
    }
    log.error("billing.invoice_failed", error);
    return fail("server_error", "Couldn't get that invoice. Please try again.", 500, NO_STORE);
  }
});
