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
}
