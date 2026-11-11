import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // mammoth and unpdf read files at runtime, which bundling breaks. postgres.js stays a plain
  // Node require too, so its socket and TLS code runs exactly as published. PGlite (the local
  // development database, src/db/local.ts) ships WASM and data files it loads from its own folder.
  serverExternalPackages: ["postgres", "@electric-sql/pglite", "mammoth", "unpdf"],
  // Production never opens the local database; keep its 25 MB out of every function.
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/pglite/**"] },
  poweredByHeader: false,
  // Dashboard pages are thin server components (their data comes from the browser's query cache),
  // so one shown in the last 30 seconds is reused on the way back instead of asked for again.
  experimental: { staleTimes: { dynamic: 30 } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Jobs live only in the app now (owner, 2026-11-11); old public job links and search results
  // land on the home page's Jobs section.
  async redirects() {
    return [
      { source: "/jobs", destination: "/#jobs", permanent: true },
      { source: "/jobs/:path*", destination: "/#jobs", permanent: true },
    ];
  },
};

const sentryDsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim() || undefined;
// An empty release name makes the Sentry plugin fail its own upload, so no commit means no name.
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || undefined;

// Without a DSN the build is left exactly as it was: no wrappers, no plugin, nothing uploaded.
// Source maps go up (and are then deleted from the output) only when SENTRY_AUTH_TOKEN is set.
export default sentryDsn
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: sentryAuthToken,
      silent: true,
      telemetry: false,
      // Turbopack writes client chunks outside the plugin's default glob; without this the
      // browser frames stay minified.
      widenClientFileUpload: true,
      sourcemaps: { disable: !sentryAuthToken, deleteSourcemapsAfterUpload: true },
      release: {
        name: commit,
        create: Boolean(sentryAuthToken),
        finalize: Boolean(sentryAuthToken),
      },
    })
  : nextConfig;
