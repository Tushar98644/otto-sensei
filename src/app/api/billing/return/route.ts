import { upgradeReturnPath } from "@/components/account/upgrade-return";
import { ROUTES } from "@/components/site/routes";
import { PAID_PLANS } from "@/config/plans";
import { NO_STORE } from "@/lib/api/respond";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Paid or still settling; the webhook, never this redirect, is what grants the plan.
const PAID_STATUSES = new Set(["active", "succeeded", "pending", "processing"]);
const STATUS_WORD = /^[a-z_]{1,32}$/;

function one(params: URLSearchParams, key: string): string | null {
  const values = params.getAll(key);
  return values.length === 1 ? (values[0] ?? null) : null;
}

function statusOf(params: URLSearchParams): string {
  return one(params, "status")?.trim().toLowerCase() ?? "";
}

export function returnTarget(params: URLSearchParams): string {
  if (one(params, "topup") === "1") return topupTarget(params);
  const plan = PAID_PLANS.find((id) => id === one(params, "plan"));
  if (!plan) return ROUTES.account;
  if (!PAID_STATUSES.has(statusOf(params))) return `${ROUTES.account}?checkout=cancelled`;
  const query = new URLSearchParams({ checkout: "success", plan });
  if (one(params, "trial") === "1") query.set("trial", "1");
  const next = upgradeReturnPath(one(params, "next"));
  if (next) query.set("next", next);
  return `${ROUTES.account}?${query}`;
}

// Credit lands with the webhook too; the page only says it is on its way.
function topupTarget(params: URLSearchParams): string {
  const paid = PAID_STATUSES.has(statusOf(params));
  const query = new URLSearchParams({ topup: paid ? "success" : "cancelled" });
  const next = paid ? upgradeReturnPath(one(params, "next")) : null;
  if (next) query.set("next", next);
  return `${ROUTES.account}?${query}`;
}

function loggableStatus(status: string): string {
  if (!status) return "none";
  return STATUS_WORD.test(status) ? status : "other";
}

// Dodo appends the buyer's email and ids to return_url: only the outcome reaches the page and its scripts.
export function GET(req: Request): Response {
  // A second "?" counts as "&", in case Dodo appends its own params to ours with one.
  const params = new URLSearchParams(new URL(req.url).search.replaceAll("?", "&"));
  log.info("billing.checkout_returned", { status: loggableStatus(statusOf(params)) });
  const location = new URL(returnTarget(params), req.url).toString();
  return new Response(null, { status: 303, headers: { ...NO_STORE, Location: location } });
}
