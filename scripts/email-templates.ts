// Reads, and with --apply writes, the sign-in code email: one template, a block per language (src/lib/auth/code-email.ts).
import { CODE_EMAIL } from "../src/lib/auth/code-email";

const SUBJECT = CODE_EMAIL.subject;
const BODY = CODE_EMAIL.body;

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
  console.error(
    "Set SUPABASE_ACCESS_TOKEN (and SUPABASE_PROJECT_REF if NEXT_PUBLIC_SUPABASE_URL isn't set).",
  );
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
  const hook = Object.entries(config).filter(
    ([key, value]) => key.startsWith("hook_send_email") && value,
  );
  for (const key of Object.keys(WANTED) as (keyof typeof WANTED)[]) {
    const value = config[key];
    const text =
      typeof value === "string" ? value.replace(/\s+/g, " ").slice(0, 90) : String(value);
    const ok = value === WANTED[key] ? "ok " : "OFF";
    console.log(`${ok} ${key}: ${text === "" ? "(empty: Supabase's default)" : text}`);
  }
  if (hook.length) console.log(`Send-email hook is on: ${hook.map(([key]) => key).join(", ")}`);
}

console.log(`Project ${ref}, saved now:`);
show(await call());

if (process.argv.includes("--apply")) {
  await call({ method: "PATCH", body: JSON.stringify(WANTED) });
  console.log("\nWritten. Saved now:");
  show(await call());
}
