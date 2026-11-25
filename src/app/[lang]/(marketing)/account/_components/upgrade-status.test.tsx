import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UpgradeStatus } from "./upgrade-status";

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

describe("UpgradeStatus when the plan hasn't arrived", () => {
  const watch = { state: "gave-up", retry: () => {} } as const;

  it("on a paid plan, says a declined card leaves the plan as it was and points to the card below", () => {
    const body = text(
      renderToStaticMarkup(<UpgradeStatus plan="pro" target="max" watch={watch} />),
    );
    expect(body).toContain("Still showing Pro?");
    expect(body).toContain(
      "If your card was declined, you stay on Pro: update your card below and try again, or email",
    );
  });

  it("on Free, just asks to check again or email us", () => {
    const body = text(
      renderToStaticMarkup(<UpgradeStatus plan="free" target="pro" watch={watch} />),
    );
    expect(body).toContain(
      "Payments can take a few minutes to reach us. Check again soon, or email",
    );
    expect(body).not.toContain("Manage billing");
  });
});

describe("UpgradeStatus once the plan has arrived", () => {
  const watch = { state: "idle", retry: () => {} } as const;

  it("with no page to go back to, offers the dashboard", () => {
    const html = renderToStaticMarkup(<UpgradeStatus plan="pro" target="pro" watch={watch} />);
    expect(html).toContain('href="/dashboard"');
    expect(text(html)).toContain("Go to your dashboard");
  });

  it("links back to the page the upgrade started on", () => {
    const html = renderToStaticMarkup(
      <UpgradeStatus plan="max" target="pro" watch={watch} next="/studio?step=tailor" />,
    );
    expect(html).toContain('href="/studio?step=tailor"');
    expect(text(html)).toContain("Pick up where you left off");
    expect(text(html)).not.toContain("Go to your dashboard");
  });
});
