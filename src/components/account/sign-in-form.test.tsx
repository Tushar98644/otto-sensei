import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthMode } from "@/lib/auth/types";

const auth = vi.hoisted(() => ({ mode: "supabase" as AuthMode }));
vi.mock("./use-me", () => ({
  useMe: () => ({ me: { auth: { mode: auth.mode } }, user: null, loading: false }),
  patchMe: () => {},
  refreshMe: async () => {},
}));

const { SignInForm } = await import("./sign-in-form");

const PRIMARY = "from-primary-top";
const SECONDARY = "shadow-control";
const DISABLED = /\sdisabled=""/;

function render() {
  const html = renderToStaticMarkup(<SignInForm />);
  const buttons = [...html.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(([button]) => button);
  const google = buttons.find((button) => button.includes("Continue with Google")) ?? "";
  const email = buttons.find((button) => button.includes("Email me a code")) ?? "";
  return { html, google, email };
}

beforeEach(() => {
  auth.mode = "supabase";
});

describe("the sign-in form", () => {
  it("leads with Google as the forest key, with the email code below as the second way in", () => {
    const { html, google, email } = render();
    expect(html.indexOf("Continue with Google")).toBeLessThan(html.indexOf("Email me a code"));
    expect(google).toContain(PRIMARY);
    expect(google).not.toMatch(DISABLED);
    expect(email).toContain(SECONDARY);
    expect(email).not.toContain(PRIMARY);
  });

  it("makes the email key the primary where Google can't work", () => {
    for (const mode of ["dev", "off"] as const) {
      auth.mode = mode;
      const { google, email } = render();
      expect(google, mode).toMatch(DISABLED);
      expect(email, mode).toContain(PRIMARY);
    }
  });
});
