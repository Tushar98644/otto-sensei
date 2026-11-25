import { describe, expect, it } from "vitest";
import { FOOTER_HREFS, ROUTES } from "@/components/site/routes";
import { isAppPage } from "./pages";

describe("isAppPage", () => {
  it.each([
    ROUTES.studio,
    ROUTES.dashboard,
    ROUTES.dashboardJobs,
    ROUTES.dashboardApplications,
    "/dashboard/applications/abc/prep",
    ROUTES.account,
    ROUTES.login,
  ])("counts %s as the app", (path) => {
    expect(isAppPage(path)).toBe(true);
  });

  it.each([
    ROUTES.home,
    ...FOOTER_HREFS,
    "/reminder",
    "/p/jane-doe",
    "/s/abc123",
    "/studio-tips",
    "/logins",
  ])("leaves %s out", (path) => {
    expect(isAppPage(path)).toBe(false);
  });
});
