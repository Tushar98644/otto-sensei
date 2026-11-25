import { describe, expect, it } from "vitest";
import { ACCOUNT_OTTO } from "@/components/account/copy";
import { LOGIN_VARIANTS, loginHeading } from "@/components/account/login-heading";
import { englishMessages } from "@/i18n/messages";
import { loginTitle } from "./login-screen";

const { login } = englishMessages();

describe("the sign-in page in English", () => {
  it.each([null, ...LOGIN_VARIANTS])("heads the %s variant as loginHeading() does", (variant) => {
    for (const trial of [true, false]) {
      expect(loginTitle(login.heading, variant, trial)).toBe(loginHeading(variant, trial));
    }
  });

  it("has Otto say what the account pages say", () => {
    expect(login.otto).toBe(ACCOUNT_OTTO.login);
  });
});
