import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability/options";

Sentry.init(sentryOptions("nodejs"));
