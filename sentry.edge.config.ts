import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability/config";

Sentry.init(sentryOptions("edge"));
