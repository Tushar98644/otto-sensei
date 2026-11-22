// The parts of Cloudflare's Email Worker API this Worker uses (ForwardableEmailMessage).
export interface IncomingEmail {
  readonly from: string;
  readonly to: string;
  readonly raw: ReadableStream<Uint8Array>;
  readonly rawSize: number;
  setReject(reason: string): void;
}

export interface Env {
  INBOUND_URL: string;
  // Comma-separated: every domain whose mail this Worker takes.
  INBOUND_DOMAINS: string;
  INBOUND_EMAIL_SECRET: string;
  // The site the hourly interview run calls, e.g. https://www.ottosensei.com.
  APP_URL: string;
  // A secret, the same value as on Vercel; until it's set the hourly run fails.
  CRON_SECRET?: string;
}

// The parts of Cloudflare's Cron Trigger API this Worker uses (ScheduledController).
export interface ScheduledRun {
  readonly cron: string;
  readonly scheduledTime: number;
}
