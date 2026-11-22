import { describe, expect, it } from "vitest";
import { extensionAccess } from "./plan";

describe("Otto for Chrome's plan rules", () => {
  it("gives every plan the badge and Save, and Tailor and Letter only where the app does", () => {
    expect(extensionAccess("free")).toEqual({
      badge: true,
      save: true,
      tailor: false,
      letter: false,
      fill: false,
    });
    expect(extensionAccess("pro")).toEqual({
      badge: true,
      save: true,
      tailor: true,
      letter: true,
      fill: true,
    });
    expect(extensionAccess("max")).toEqual({
      badge: true,
      save: true,
      tailor: true,
      letter: true,
      fill: true,
    });
  });
});
