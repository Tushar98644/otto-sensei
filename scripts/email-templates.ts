// Shows, and with --apply writes, the sign-in email templates on the hosted Supabase project
// through the Management API, so no dashboard paste can mangle {{ .Token }}.
//
//   read -s SUPABASE_ACCESS_TOKEN && export SUPABASE_ACCESS_TOKEN   # a token from supabase.com/dashboard/account/tokens
//   bun scripts/email-templates.ts            # print what is saved now
//   bun scripts/email-templates.ts --apply    # write SETUP.md 6e's templates, then print again
//
// SUPABASE_PROJECT_REF defaults to the ref inside NEXT_PUBLIC_SUPABASE_URL.

const SITE = "https://www.ottosensei.com";

const SUBJECT = "Your Otto Sensei code: {{ .Token }}";
const BODY = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#12241d;max-width:480px">
<img src="${SITE}/email/otto-head.png" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
<p style="margin:0 0 8px">Your Otto Sensei code is</p>
<p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p style="margin:0 0 16px">It expires in 10 minutes.</p>
<p style="margin:0;color:#475850;font-size:14px">If you didn't ask for this, you can ignore this email.</p>
</div>`;

// New people get the confirmation email, returning people the magic-link one; both carry the code.
const WANTED = {
  mailer_subjects_confirmation: SUBJECT,
  mailer_templates_confirmation_content: BODY,
  mailer_subjects_magic_link: SUBJECT,
  mailer_templates_magic_link_content: BODY,
  mailer_otp_exp: 600,
  mailer_otp_length: 6,
};

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!token || !ref) {
  console.error("Set SUPABASE_ACCESS_TOKEN (and SUPABASE_PROJECT_REF if NEXT_PUBLIC_SUPABASE_URL isn't set).");
  process.exit(1);
}

const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function call(init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers, ...init });
  if (!res.ok) {
    console.error(`${init?.method ?? "GET"} ${url}: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  return (await res.json()) as Record<string, unknown>;
}

function show(config: Record<string, unknown>) {
  const hook = Object.entries(config).filter(([key, value]) => key.startsWith("hook_send_email") && value);
  for (const key of Object.keys(WANTED) as (keyof typeof WANTED)[]) {
    const value = config[key];
    const text = typeof value === "string" ? value.replace(/\s+/g, " ").slice(0, 90) : String(value);
    const ok = value === WANTED[key] ? "ok " : "OFF";
    console.log(`${ok} ${key}: ${text === "" ? "(empty: Supabase's default)" : text}`);
  }
  // A send-email hook replaces the templates entirely.
  if (hook.length) console.log(`Send-email hook is on: ${hook.map(([key]) => key).join(", ")}`);
}

console.log(`Project ${ref}, saved now:`);
show(await call());

if (process.argv.includes("--apply")) {
  await call({ method: "PATCH", body: JSON.stringify(WANTED) });
  console.log("\nWritten. Saved now:");
  show(await call());
}
