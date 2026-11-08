// Named re-exports, not the namespace: the lazy chunk then holds only what we call, without
// replay, feedback or profiling.
export { captureException, captureRouterTransitionStart, init } from "@sentry/nextjs";
