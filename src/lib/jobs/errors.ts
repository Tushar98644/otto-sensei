// All but invalid_url end the same way: the studio asks for the job text instead.

export type JobReadReason =
  | "invalid_url"
  | "private_address"
  | "login_required"
  | "blocked"
  | "listing"
  | "not_found"
  | "unreachable"
  | "timeout"
  | "too_large"
  | "not_a_page"
  | "no_text";

export class JobReadError extends Error {
  readonly reason: JobReadReason;
  readonly site: string | null;
  // For logs only.
  readonly detail: string | null;

  constructor(
    reason: JobReadReason,
    { site = null, detail = null }: { site?: string | null; detail?: string | null } = {},
  ) {
    super(`Job read failed: ${reason}`);
    this.name = "JobReadError";
    this.reason = reason;
    this.site = site;
    this.detail = detail;
  }
}

const PASTE = "Paste the job text instead.";

export function jobReadMessage({ reason, site }: JobReadError): string {
  switch (reason) {
    case "invalid_url":
      return "That doesn't look like a job link. Copy the full address from your browser, starting with https://.";
    case "private_address":
      return `Otto can only read public job pages. ${PASTE}`;
    case "login_required":
      return `${site ?? "That site"} needs a login, so Otto can't read it. ${PASTE}`;
    case "blocked":
      return `${site ?? "That site"} doesn't let Otto read its pages. ${PASTE}`;
    case "listing":
      return "That link shows a list of jobs. Open the job you want and copy its link.";
    case "not_found":
      return "Otto couldn't find that job. It may have closed. Check the link, or paste the job text instead.";
    case "unreachable":
      return "Otto couldn't open that page. Check the link, or paste the job text instead.";
    case "timeout":
      return "That page took too long to open. Try again, or paste the job text instead.";
    case "too_large":
      return `That page is too big for Otto to read. ${PASTE}`;
    case "not_a_page":
      return `That link opens a file, not a job page. ${PASTE}`;
    case "no_text":
      return `Otto couldn't find the job post on that page. ${PASTE}`;
  }
}
