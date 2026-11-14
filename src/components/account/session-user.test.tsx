import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Me } from "./use-me";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
const api = vi.hoisted(() => ({ me: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));

const { SessionUserProvider, useSessionUserId } = await import("./session-user");
const { signedInUserId } = await import("./use-me");
const { useWorkProfile } = await import("@/components/eligibility/use-work-profile");
const { useNotifications } = await import("@/components/notifications/use-notifications");
const { useAccountSetup } = await import("@/components/setup/use-account-setup");

const ME: Me = {
  user: { id: "ada", email: "ada@example.com", plan: "pro", planInterval: "month", planRenewsAt: null },
  usage: null,
  period: null,
  aiBudget: null,
  billing: { mode: "mock", offer: { pro: ["month"], max: ["month"] }, trial: false },
  auth: { mode: "supabase" },
};

function Probe() {
  const work = useWorkProfile();
  const bell = useNotifications();
  const setup = useAccountSetup();
  return <>{[useSessionUserId() ?? "nobody", work.status, bell.status, setup.status].join(" ")}</>;
}

const inDashboard = (children: ReactNode) => (
  <SessionUserProvider userId="ada" me={ME}>
    {children}
  </SessionUserProvider>
);

describe("SessionUserProvider", () => {
  it("gives the hooks the layout's account before /api/me could answer", () => {
    expect(renderToStaticMarkup(inDashboard(<Probe />))).toBe("ada loading loading loading");
    expect(api.me).not.toHaveBeenCalled();
  });

  it("never writes the shared account store on the server, so no other request sees it", () => {
    renderToStaticMarkup(inDashboard(<Probe />));
    expect(signedInUserId()).toBeNull();
  });

  it("leaves pages outside the dashboard waiting for /api/me, as before", () => {
    expect(renderToStaticMarkup(<Probe />)).toBe("nobody unknown signed_out unknown");
  });
});
