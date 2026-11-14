import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const permissionsPolicy = (payment: string) =>
  `camera=(), microphone=(self), geolocation=(), payment=${payment}`;

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Voice typing needs the microphone on our own pages; embeds still get none.
  { key: "Permissions-Policy", value: permissionsPolicy("()") },
];

// Apple Pay and Google Pay run inside Paddle's checkout frame, which only /checkout loads.
const checkoutHeaders = [
  {
    key: "Permissions-Policy",
    value: permissionsPolicy('(self "https://buy.paddle.com" "https://sandbox-buy.paddle.com")'),
  },
];

const nextConfig: NextConfig = {
  // Bundling breaks these: they read their own files (WASM, data) or sockets at runtime.
  serverExternalPackages: ["postgres", "@electric-sql/pglite", "mammoth", "unpdf"],
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/pglite/**"] },
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
    // The last entry wins for a key both set, so the /checkout override comes after the global one.
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/checkout", headers: checkoutHeaders },
    ];
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
