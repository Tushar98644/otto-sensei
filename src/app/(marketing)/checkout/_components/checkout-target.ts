import { ROUTES } from "@/components/site/routes";
import { PAID_PLANS } from "@/config/plans";

export const PADDLE_JS_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";

export type CheckoutSearchParams = Record<string, string | string[] | undefined>;

export type CheckoutTarget = { transactionId: string; successPath: string; cancelPath: string };

const TRANSACTION_ID = /^txn_[a-z\d]{26}$/;
const CLIENT_TOKEN = /^(test|live)_\S+$/;

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);

export function checkoutTarget(params: CheckoutSearchParams): CheckoutTarget | null {
  const transactionId = one(params._ptxn);
  if (transactionId === null || !TRANSACTION_ID.test(transactionId)) return null;
  const plan = PAID_PLANS.find((id) => id === one(params.plan));
  // Paddle's own links (a card update, its emails) carry no plan: nothing new was bought.
  if (!plan) return { transactionId, successPath: ROUTES.account, cancelPath: ROUTES.account };
  const trial = one(params.trial) === "1" ? "&trial=1" : "";
  return {
    transactionId,
    successPath: `${ROUTES.account}?checkout=success&plan=${plan}${trial}`,
    cancelPath: `${ROUTES.account}?checkout=cancelled`,
  };
}

export function paddleClientToken(raw: string | undefined): string | null {
  const token = raw?.trim() ?? "";
  return CLIENT_TOKEN.test(token) ? token : null;
}

export function isSandboxToken(token: string): boolean {
  return token.startsWith("test_");
}

export function checkoutExit(
  event: string | undefined,
  completed: boolean,
  target: CheckoutTarget,
): string | null {
  if (event === "checkout.completed") return target.successPath;
  if (event === "checkout.closed" && !completed) return target.cancelPath;
  return null;
}
