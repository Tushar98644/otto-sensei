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
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30_000,
  },
});
