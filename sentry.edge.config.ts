import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability/config";

// Imported by register() in src/instrumentation.ts, only when Sentry is on for the edge runtime.
Sentry.init(sentryOptions("edge"));
