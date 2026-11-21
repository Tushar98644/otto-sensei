"use client";

import type { QueryClient } from "@tanstack/react-query";
import { lazyComponent } from "@/components/ui/lazy";
import type { SessionUser } from "@/lib/auth/types";
import { portfolioQuery } from "@/lib/queries/options";
import { loadTemplate } from "./templates/lazy";

export const editorLoader = lazyComponent(() =>
  import("./portfolio-editor").then((module) => module.PortfolioEditor),
);
export const upgradeLoader = lazyComponent(() =>
  import("./portfolio-upgrade").then((module) => module.PortfolioUpgrade),
);
export const startLoader = lazyComponent(() =>
  import("./portfolio-start").then((module) => module.PortfolioStart),
);

// Called on the sidebar link's hover, so the page opens on its screen and design with no wait.
export function preloadPortfolio(client: QueryClient, user: SessionUser): Promise<unknown> {
  if (user.plan === "free") return upgradeLoader.load();
  const design = client
    .fetchQuery(portfolioQuery(user.id))
    .then((portfolio): Promise<unknown> =>
      portfolio ? loadTemplate(portfolio.template) : startLoader.load(),
    );
  return Promise.all([editorLoader.load(), design]);
}
