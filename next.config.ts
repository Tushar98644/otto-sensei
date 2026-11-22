import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Voice typing needs the microphone on our own pages; embeds still get none.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=()",
  },
];

// E2E's own output folder (e2e/server.ts); its tsconfig only extends ours, so next dev leaves tsconfig.json alone.
const distDir = process.env.OTTO_NEXT_DIST_DIR?.trim() || undefined;

const nextConfig: NextConfig = {
  distDir,
  ...(distDir ? { typescript: { tsconfigPath: "tsconfig.e2e.json" } } : {}),
  // Bundling breaks these: they read their own files (WASM, data) or sockets at runtime.
  serverExternalPackages: ["postgres", "@electric-sql/pglite", "mammoth", "unpdf"],
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/pglite/**"] },
  // The resume PDF route draws with the same font files the browser loads from /fonts/pdf.
  outputFileTracingIncludes: { "/api/extension/resume-file": ["./public/fonts/pdf/**/*"] },
  // react-pdf code that never runs in the browser (about 116 KB gzip); see src/lib/pdf/shims.
  turbopack: {
    resolveAlias: {
      "@react-pdf/reconciler": { browser: "./src/lib/pdf/shims/reconciler.ts" },
      "@react-pdf/hyphenate/en-us": { browser: "./src/lib/pdf/shims/hyphenate-en-us.ts" },
      "brotli/decompress.js": { browser: "./src/lib/pdf/shims/brotli-decompress.ts" },
    },
  },
  poweredByHeader: false,
  // Tabs open across a deploy reload once instead of requesting code that no longer exists.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID?.trim() || undefined,
  experimental: { staleTimes: { dynamic: 30 } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: sentryAuthToken,
      silent: true,
      telemetry: false,
      // Turbopack writes client chunks outside the plugin's default glob.
      widenClientFileUpload: true,
      // Errors only: tracing, the Pages Router it pulls in, and the route list it names spans with stay out.
      bundleSizeOptimizations: { excludeTracing: true, excludeDebugStatements: true },
      routeManifestInjection: false,
      sourcemaps: { disable: !sentryAuthToken, deleteSourcemapsAfterUpload: true },
      release: {
        name: commit,
        create: Boolean(sentryAuthToken),
        finalize: Boolean(sentryAuthToken),
      },
    })
  : nextConfig;
