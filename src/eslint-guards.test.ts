import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: fileURLToPath(new URL("..", import.meta.url)) });

async function rulesHit(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((message) => message.ruleId ?? message.message);
}

const DB_WRITE = (chain: string) => `import { isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs } from "@/db/schema";

export async function write() {
  const db = await getDb();
  await db${chain};
  return isNull;
}
`;

describe("browser code imports", () => {
  it.each([
    ["src/components/a.tsx", 'import { z } from "zod";\nexport const name = z.string();\n'],
    [
      "src/lib/store/a.ts",
      'import { schema } from "@/db/client";\nexport const tables = schema;\n',
    ],
    [
      "src/components/a.tsx",
      'import { DRAFT_LIMITS, type DraftRequestBody } from "@/lib/api/types";\nexport const jobs: DraftRequestBody | number = DRAFT_LIMITS.jobs;\n',
    ],
    [
      "src/app/[lang]/(marketing)/_components/a.tsx",
      '"use client";\n\nimport { getDb } from "@/db/client";\nexport const open = getDb;\n',
    ],
    [
      "src/instrumentation-client.ts",
      'import { z } from "zod";\nexport const name = z.string();\n',
    ],
  ])("refuses a value import in %s", async (file, code) => {
    expect(await rulesHit(file, code)).toEqual(["otto/client-imports"]);
  });

  it.each([
    [
      "src/components/a.tsx",
      'import type { ZodString } from "zod";\nexport type Name = ZodString;\n',
    ],
    ["src/lib/queries/a.ts", 'import { type Db } from "@/db/client";\nexport type Store = Db;\n'],
    [
      "src/app/[lang]/(marketing)/_components/a.tsx",
      'import { getDb } from "@/db/client";\nexport const open = getDb;\n',
    ],
    ["src/lib/a.ts", 'import { z } from "zod";\nexport const name = z.string();\n'],
    ["src/components/a.test.tsx", 'import { z } from "zod";\nexport const name = z.string();\n'],
  ])("allows %s", async (file, code) => {
    expect(await rulesHit(file, code)).toEqual([]);
  });
});

describe("ignored paths", () => {
  it("skips agent worktrees under .claude, so a local lint run checks only this checkout", async () => {
    expect(await eslint.isPathIgnored(".claude/worktrees/a/src/components/a.tsx")).toBe(true);
    expect(await eslint.isPathIgnored("src/components/a.tsx")).toBe(false);
  });
});

describe("lazy SDKs", () => {
  it.each([
    [
      "src/lib/a.ts",
      'import * as Sentry from "@sentry/nextjs";\nexport const report = Sentry.captureException;\n',
    ],
    ["src/lib/a.ts", 'import posthog from "posthog-js";\nexport const client = posthog;\n'],
    [
      "src/lib/observability/a.ts",
      'import { init } from "./sentry-browser";\nexport const start = init;\n',
    ],
  ])("refuses a static import in %s", async (file, code) => {
    expect(await rulesHit(file, code)).toEqual(["no-restricted-imports"]);
  });

  it.each([
    ["src/lib/a.ts", 'export async function load() {\n  return import("@sentry/nextjs");\n}\n'],
    ["src/lib/a.ts", 'import type { PostHog } from "posthog-js";\nexport type Client = PostHog;\n'],
    [
      "src/lib/observability/sentry-browser.ts",
      'export { captureException, init } from "@sentry/nextjs";\n',
    ],
  ])("allows %s", async (file, code) => {
    expect(await rulesHit(file, code)).toEqual([]);
  });
});

describe("database writes", () => {
  it.each([
    [".update(jobs).set({ closedAt: 1 })", "no-restricted-syntax"],
    [".update(jobs).set({ closedAt: 1 }).returning()", "no-restricted-syntax"],
    [".delete(jobs)", "drizzle/enforce-delete-with-where"],
  ])("refuses db%s without .where()", async (chain, rule) => {
    expect(await rulesHit("src/lib/a.ts", DB_WRITE(chain))).toEqual([rule]);
  });

  it.each([
    ".update(jobs).set({ closedAt: 1 }).where(isNull(jobs.closedAt))",
    ".update(jobs).set({ closedAt: 1 }).where(isNull(jobs.closedAt)).returning()",
    ".update(jobs).set({ closedAt: 1 }).from(jobs).where(isNull(jobs.closedAt))",
    ".delete(jobs).where(isNull(jobs.closedAt))",
  ])("allows db%s", async (chain) => {
    expect(await rulesHit("src/lib/a.ts", DB_WRITE(chain))).toEqual([]);
  });
});

describe("copy in the markup", () => {
  it.each([
    ["JSX text", "export const A = () => <p>Save changes</p>;\n"],
    ["an aria-label", 'export const A = () => <button aria-label="Close dialog" />;\n'],
    ["a placeholder", "export const A = () => <input placeholder={`Search jobs`} />;\n"],
    ["a string child", 'export const A = () => <p>{"Try again"}</p>;\n'],
  ])("refuses %s", async (_what, code) => {
    expect(await rulesHit("src/components/a.tsx", code)).toEqual(["otto/no-literal-copy"]);
  });

  it.each([
    ["words from messages", "export const A = ({ t }: { t: string }) => <p>{t}</p>;\n"],
    ["a brand name", "export const A = () => <span>Pro</span>;\n"],
    ["a single key", "export const A = () => <kbd>K</kbd>;\n"],
    ["CSS", "export const A = () => <style>{`:root{--a:1}`}</style>;\n"],
    ["an example value", 'export const A = () => <input placeholder="https://" />;\n'],
  ])("allows %s", async (_what, code) => {
    expect(await rulesHit("src/components/a.tsx", code)).toEqual([]);
  });

  it("leaves the guides to their own phase", async () => {
    const file = "src/app/[lang]/(marketing)/compare/a.tsx";
    expect(await rulesHit(file, "export const A = () => <p>Save changes</p>;\n")).toEqual([]);
  });
});

describe("English-only Intl formats", () => {
  it.each([
    'export const day = new Intl.DateTimeFormat("en-US", { month: "short" });\n',
    'export const count = (n: number) => n.toLocaleString("en-US");\n',
  ])("refuses a literal en-US: %s", async (code) => {
    expect(await rulesHit("src/components/a.ts", code)).toEqual(["otto/no-en-us-intl"]);
  });

  it("allows it where English is meant, and outside Intl", async () => {
    const usd = 'export const usd = new Intl.NumberFormat("en-US");\n';
    expect(await rulesHit("src/lib/billing/prices.ts", usd)).toEqual([]);
    expect(await rulesHit("src/components/a.ts", 'export const tag = "en-US";\n')).toEqual([]);
  });
});
