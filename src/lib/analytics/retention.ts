import type { ApplicationStatus } from "@/lib/applications/status";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { JobSaveSource } from "./events";
import type { DashboardSection, EmailLanding } from "./landing";
import { captureServerEvent } from "./server";

// The events that show whether people come back, each built in one place so its shape is tested.

export function trackDashboardView(userId: string, section: DashboardSection): void {
  captureServerEvent(userId, "dashboard_viewed", { section });
}

export function trackReturn(
  userId: string,
  section: DashboardSection,
  daysAway: number | null,
): void {
  captureServerEvent(
    userId,
    "returned",
    daysAway === null ? { section } : { section, days_away: daysAway },
  );
}

export function trackEmailClick(userId: string, landing: EmailLanding): void {
  const { campaign, link } = landing;
  captureServerEvent(
    userId,
    "email_clicked",
    link === undefined ? { campaign } : { campaign, link },
  );
}

export function trackJobSaved(userId: string, source: JobSaveSource): void {
  captureServerEvent(userId, "job_saved", { source });
}

export type StatusChange = { from: ApplicationStatus; to: ApplicationStatus };

// One event per kind of move, so a board moving 40 cards at once sends one, not 40.
export function trackStatusChanges(userId: string, changes: readonly StatusChange[]): void {
  const moves = new Map<string, StatusChange & { count: number }>();
  for (const { from, to } of changes) {
    if (from === to) continue;
    const key = `${from}:${to}`;
    const move = moves.get(key);
    if (move) move.count += 1;
    else moves.set(key, { from, to, count: 1 });
  }
  for (const move of moves.values()) {
    captureServerEvent(userId, "application_status_changed", move);
  }
}

export function trackTailoredCopy(userId: string): void {
  captureServerEvent(userId, "tailored_copy_made", {});
}

export function trackPortfolioPublished(userId: string, template: PortfolioTemplateId): void {
  captureServerEvent(userId, "portfolio_published", { template });
}

export function trackShareViewed(ownerId: string): void {
  captureServerEvent(ownerId, "share_link_viewed", {});
}

export function trackPortfolioViewed(ownerId: string): void {
  captureServerEvent(ownerId, "portfolio_viewed", {});
}

export function trackExtensionConnected(userId: string): void {
  captureServerEvent(userId, "extension_connected", {});
}
