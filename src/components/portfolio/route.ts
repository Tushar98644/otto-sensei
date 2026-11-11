export const PORTFOLIO_ROUTE = "/dashboard/portfolio";

export function portfolioFrom(resumeId: string): string {
  return `${PORTFOLIO_ROUTE}?resume=${encodeURIComponent(resumeId)}`;
}
