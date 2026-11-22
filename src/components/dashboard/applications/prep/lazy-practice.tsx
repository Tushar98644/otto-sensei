"use client";

import { Lazy, lazyComponent } from "@/components/ui/lazy";
import type { PracticeModeProps } from "./practice-mode";

// Its own chunk: the pack page loads it while idle, and it mounts only while open.
const loader = lazyComponent(() => import("./practice-mode").then((m) => m.PracticeMode));

export function LazyPractice({ open, ...props }: PracticeModeProps & { open: boolean }) {
  return <Lazy loader={loader} wanted={open} props={props} />;
}
