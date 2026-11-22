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
  },
};

const LAZY_SDKS = {
  regex: "^(@sentry/|posthog-js($|/))|(^|/)sentry-browser$",
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
