import type { ComponentProps } from "react";
import { LoadingScreenHost } from "@/components/mascot/otto-loading-screen";
import { RootFrame } from "./root-frame";

export { rootMetadata, ROOT_VIEWPORT } from "./root-frame";

// Both app roots use this: src/app/[lang]/layout.tsx and the portfolios' src/app/p/[slug]/layout.tsx.
export function RootDocument({ children, ...frame }: ComponentProps<typeof RootFrame>) {
  return (
    <RootFrame {...frame}>
      <LoadingScreenHost>{children}</LoadingScreenHost>
    </RootFrame>
  );
}
