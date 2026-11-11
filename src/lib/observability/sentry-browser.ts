// Named re-exports, not the namespace, so the lazy chunk skips replay, feedback and profiling.
export { captureException, captureRouterTransitionStart, init } from "@sentry/nextjs";
