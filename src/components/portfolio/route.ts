// The Portfolio screen, kept out of site/routes.ts like TRASH_ROUTE, so this feature doesn't edit
// a file other features change at the same time.
export const PORTFOLIO_ROUTE = "/dashboard/portfolio";

/** "Make my portfolio" from a resume card: the screen makes it from this resume in one go. */
export function portfolioFrom(resumeId: string): string {
  return `${PORTFOLIO_ROUTE}?resume=${encodeURIComponent(resumeId)}`;
}
