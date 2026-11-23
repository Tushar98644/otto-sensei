"use client";

import { use, type ComponentType, type ReactNode } from "react";
import type { DesignFaces } from "./faces";

type PropsOf<T> = T extends ComponentType<infer P> ? P : never;

// React's use() reads these fields, so a promise that has settled draws at once instead of suspending first.
export function markFulfilled<T>(promise: Promise<T>, value: T): void {
  Object.assign(promise, { status: "fulfilled", value });
}

// One design's islands: /p keeps them from its runtime chunk (portfolio-runtime.tsx), the editor preloads them with the template.
export function islandsOnDemand<M extends object>(load: () => Promise<M>) {
  let pending: Promise<M> | null = null;
  const fetch = (): Promise<M> => {
    if (!pending) {
      const loading: Promise<M> = load().then((module) => {
        markFulfilled(loading, module);
        return module;
      });
      pending = loading;
    }
    return pending;
  };

  return {
    keep(module: M): void {
      pending ??= Promise.resolve(module);
      markFulfilled(pending, module);
    },
    preload: fetch,
    part<K extends keyof M>(name: K): ComponentType<PropsOf<M[K]>> {
      function Island(props: PropsOf<M[K]>): ReactNode {
        const Part = use(fetch())[name] as ComponentType<object>;
        return <Part {...(props as object)} />;
      }
      Island.displayName = String(name);
      return Island;
    },
  };
}

// /p's part for one design: its faces' variables at :root, its islands kept from the same chunk.
export function designRuntime(fonts: DesignFaces) {
  return function DesignRuntime() {
    return (
      <style href="pf-fonts" precedence="default">
        {`:root{${fonts.variables}}`}
      </style>
    );
  };
}
