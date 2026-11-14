type Builder = {
  module?: (specifier: string, load: () => { exports: object; loader: "object" }) => void;
};
type BunRuntime = { plugin: (plugin: { name: string; setup: (build: Builder) => void }) => void };

// Next swaps "server-only" for an empty module on the server; plain bun scripts get the same.
try {
  (globalThis as { Bun?: BunRuntime }).Bun?.plugin({
    name: "server-only",
    setup(build) {
      build.module?.("server-only", () => ({ exports: {}, loader: "object" }));
    },
  });
} catch {
  // Every bun run loads this file, migrations included, so it must never stop one.
}

export {};
