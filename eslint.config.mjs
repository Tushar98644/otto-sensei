import { defineConfig, globalIgnores } from "eslint/config";
import { builtinRules } from "eslint/use-at-your-own-risk";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginQuery from "@tanstack/eslint-plugin-query";
import drizzle from "eslint-plugin-drizzle";

const restrictedImports = builtinRules.get("no-restricted-imports");

// Browser code: these paths, plus any file that starts with "use client".
const CLIENT_PATHS =
  /\/src\/(components|lib\/(store|sync|queries))\/|\/src\/(lib\/api\/client|instrumentation-client)\.ts$/;

const COPY_PROPS = new Set(["aria-label", "title", "placeholder", "alt"]);
// CSS and scripts inside JSX are code, not words.
const CODE_ELEMENTS = new Set(["style", "script"]);
const LOCALE_METHODS = new Set([
  "toLocaleString",
  "toLocaleDateString",
  "toLocaleTimeString",
  "localeCompare",
]);

const otto = {
  meta: { name: "otto", version: "1.0.0" },
  rules: {
    "client-imports": {
      meta: restrictedImports.meta,
      create(context) {
        const client =
          CLIENT_PATHS.test(context.filename) ||
          context.sourceCode.ast.body.some((node) => node.directive === "use client");
        return client ? restrictedImports.create(context) : {};
      },
    },
    // Words people read come from src/i18n/messages (or a prop), so every language can have them.
    "no-literal-copy": {
      meta: {
        type: "problem",
        schema: [
          {
            type: "object",
            properties: { allow: { type: "array", items: { type: "string" } } },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        const allow = new Set(context.options[0]?.allow ?? []);
        const report = (node, text) => {
          const words = text.replace(/\s+/g, " ").trim();
          // One letter alone is a key or a mark ("Z" in ⌘Z), not copy.
          if ((words.match(/\p{L}/gu) ?? []).length < 2 || allow.has(words)) return;
          context.report({
            node,
            message: `"${words.slice(0, 60)}" is written into the markup: read it from the messages (src/i18n) or take it as a prop.`,
          });
        };
        const literalText = (node) => {
          if (node?.type === "Literal" && typeof node.value === "string") return node.value;
          if (node?.type === "TemplateLiteral")
            return node.quasis.map((q) => q.value.cooked).join(" ");
          return null;
        };
        return {
          JSXText(node) {
            if (CODE_ELEMENTS.has(node.parent.openingElement?.name?.name)) return;
            report(node, node.value);
          },
          JSXAttribute(node) {
            if (!COPY_PROPS.has(node.name.name)) return;
            const value =
              node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value;
            const text = literalText(value);
            if (text !== null) report(node, text);
          },
          "JSXElement > JSXExpressionContainer, JSXFragment > JSXExpressionContainer"(node) {
            if (CODE_ELEMENTS.has(node.parent.openingElement?.name?.name)) return;
            const text = literalText(node.expression);
            if (text !== null) report(node, text);
          },
        };
      },
    },
    // English number and date formats only where English is meant; everywhere else, format.* or formatFor(locale).
    "no-en-us-intl": {
      meta: { type: "problem", schema: [] },
      create(context) {
        const intl = (callee) =>
          callee?.type === "MemberExpression" && callee.object?.name === "Intl";
        const localeMethod = (callee) =>
          callee?.type === "MemberExpression" && LOCALE_METHODS.has(callee.property?.name);
        return {
          Literal(node) {
            if (node.value !== "en-US") return;
            const call = node.parent;
            if (call?.type !== "NewExpression" && call?.type !== "CallExpression") return;
            if (!call.arguments.includes(node)) return;
            if (intl(call.callee) || localeMethod(call.callee)) {
              context.report({
                node,
                message:
                  'A literal "en-US" pins this to English: use format.* from useFormat()/getFormat(), or formatFor(locale).',
              });
            }
          },
        };
      },
    },
  },
};

const LAZY_SDKS = {
  regex: "^(@sentry/|posthog-js($|/)|web-vitals($|/))|(^|/)sentry-browser$",
  allowTypeImports: true,
  message:
    "Load it with import() when it is needed, as src/lib/observability/browser.ts does: a static import puts the SDK in the chunk of every page that reaches this file.",
};

const SERVER_ONLY = [
  {
    regex: "^zod($|/)",
    allowTypeImports: true,
    message:
      "Browser code never loads zod: request schemas live in validation.ts files that only server code imports.",
  },
  {
    regex: "^@/lib/api/types$",
    allowTypeImports: true,
    message:
      "It loads zod and every request schema: use `import type` here, and keep plain constants in a module without zod.",
  },
  {
    regex: "^@/db($|/)",
    allowTypeImports: true,
    message: "Database code runs only on the server.",
  },
];

const COPY_ALLOW = [
  // Names and marks that read the same in every language.
  "Otto",
  "Pro",
  "Max",
  "PDF",
  "Word",
  "GitHub",
  "LinkedIn",
  "Google",
  "Esc",
  "Enter",
  // Example values in placeholders and sample cards: names, products and links stay as written.
  "https://",
  "Alex Morgan",
  "alex@example.com",
  "Google Data Analytics Certificate",
  "Northwind",
  "Contoso",
  "linkedin.com/in/alex-morgan",
  "github.com/alex/budget",
  "React, Node.js, PostgreSQL",
  "ledgerly.com",
  "manchester.ac.uk",
  "1.4M",
  "V5",
  "Designing Data-Intensive Applications",
  "Martin Kleppmann",
  "Maya Okafor",
];

// Files whose words aren't read from the messages here, each group with its reason.
const COPY_ELSEWHERE = [
  // The guides stay English until P5 (docs/i18n.md), and another phase owns them.
  "src/app/[[]lang]/(marketing)/ats/**",
  "src/app/[[]lang]/(marketing)/compare/**",
  "src/app/[[]lang]/(marketing)/resume-examples/**",
  "src/app/[[]lang]/(marketing)/resume-templates/**",
  // Job feed pieces, translated with P6 (jobs).
  "src/components/dashboard/jobs/looking-for-card.tsx",
  "src/components/dashboard/jobs/occupation-search.tsx",
  "src/components/dashboard/applications/mark-applied.tsx",
  // Rendered to an image (Open Graph); no reader's language at that point.
  "src/app/opengraph-image.tsx",
  // Not rendered anywhere today; translate before using them again.
  "src/components/account/pro-perks.tsx",
  "src/components/account/plan-picker.tsx",
  // Still English: the weekly recap, and the portfolio designs another change translates (docs/i18n.md, Known gaps).
  "src/components/recap/**",
];

// Where English formats are meant: English sources and defaults, machine text (time zones, analytics, AI input), and areas other phases own.
const EN_US_ALLOWED = [
  "src/i18n/config.ts",
  "src/lib/billing/prices.ts",
  "src/config/topup.ts",
  "src/lib/usage-copy.ts",
  "src/lib/ai-budget-copy.ts",
  "src/lib/applications/stats.ts",
  "src/lib/insights/skill-gaps.ts",
  "src/components/mascot/lines.ts",
  "src/components/dashboard/applications/view.ts",
  "src/lib/analytics/**",
  "src/lib/calendar/zones.ts",
  "src/lib/career-log/schedule.ts",
  "src/lib/eligibility/profile.ts",
  "src/lib/eligibility/time.ts",
  "src/lib/portfolio/places.ts",
  "src/lib/setup/guess.ts",
  "src/lib/github/facts.ts",
  "src/lib/interviews/autopilot.ts",
  "src/app/api/**",
  "src/lib/notifications/**",
  "src/lib/job-feed/**",
  "src/lib/inbound/**",
  "src/lib/seo-pages/**",
  // Portfolio designs' machine text: time-zone math that parses an en-US date, and a count-up that redraws the owner's own "4,000".
  "src/components/portfolio/templates/bento/islands.tsx",
  "src/components/portfolio/templates/cv/islands.tsx",
  "src/components/portfolio/templates/starring/islands.tsx",
  // Not rendered anywhere today; translate before using it again.
  "src/components/account/pro-perks.tsx",
  "src/components/recap/**",
  "src/lib/recap/**",
];

const UNFILTERED = ":not(MemberExpression[property.name=/^(where|from)$/]) >";
const DB = "/^(db|tx)$/";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...pluginQuery.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    plugins: { otto },
    rules: {
      "no-restricted-imports": ["error", { patterns: [LAZY_SDKS] }],
      "otto/client-imports": ["error", { patterns: SERVER_ONLY }],
      "no-restricted-syntax": [
        "error",
        {
          selector: `${UNFILTERED} CallExpression[callee.property.name="set"][callee.object.callee.property.name="update"][callee.object.callee.object.name=${DB}]`,
          message: "An update without .where() rewrites every row in the table.",
        },
      ],
    },
  },
  // docs/i18n.md guardrails: no copy written into the markup, and no English-only Intl formats.
  {
    files: ["src/**/*.tsx"],
    ignores: ["**/*.test.tsx", ...COPY_ELSEWHERE],
    plugins: { otto },
    rules: { "otto/no-literal-copy": ["error", { allow: COPY_ALLOW }] },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", ...EN_US_ALLOWED],
    plugins: { otto },
    rules: { "otto/no-en-us-intl": "error" },
  },
  {
    files: ["src/lib/observability/sentry-browser.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Playwright fixtures hand their value to a callback named use, which is not React's use().
  {
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "local.db*",
    "public/**",
    ".claude/**",
    "extension/dist/**",
  ]),
]);
