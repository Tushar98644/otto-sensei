// Named re-exports, not the namespace, so the lazy chunk skips replay, feedback and profiling.
export { captureException, init } from "@sentry/nextjs";
export { sentryOptions } from "./options";
