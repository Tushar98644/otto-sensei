import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next swaps "server-only" for this empty module on the server; tests run outside Next.
      "server-only": fileURLToPath(
        new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url),
      ),
      // Next's compiler writes this module per app; tests get a stub they can set.
      "next/root-params": fileURLToPath(new URL("./src/i18n/testing.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "extension/**/*.test.ts",
      "workers/**/*.test.ts",
    ],
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30_000,
    // Opening a database copy in a setup hook can take over 10 s on a busy machine.
    hookTimeout: 30_000,
    // Off unless --coverage is passed (bun run test:coverage).
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/test-fixtures.{ts,tsx}",
        "src/**/test-helpers.ts",
        "src/**/testing.ts",
        "src/**/*-testing.ts",
        "src/db/test-template.ts",
      ],
      reporter: ["text-summary", "html", "json-summary"],
      reportOnFailure: true,
    },
  },
});
