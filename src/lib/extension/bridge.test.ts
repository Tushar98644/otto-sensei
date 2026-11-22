import { describe, expect, it } from "vitest";
import { EXTENSION_SOURCE, PAGE_SOURCE, readExtensionMessage, readPageMessage } from "./bridge";
import { letterPostPath, savedPostBoardPath, savedPostFromHash, tailorPostPath } from "./links";

describe("the connect page's messages", () => {
  it("reads only well-formed messages from the right side", () => {
    expect(readPageMessage({ source: PAGE_SOURCE, type: "hello" })).toEqual({
      source: PAGE_SOURCE,
      type: "hello",
    });
    expect(
      readPageMessage({ source: PAGE_SOURCE, type: "token", token: "otto_ext_x", expiresAt: 5 }),
    ).toMatchObject({ token: "otto_ext_x" });
    expect(readPageMessage({ source: EXTENSION_SOURCE, type: "hello" })).toBeNull();
    expect(readPageMessage({ source: PAGE_SOURCE, type: "token", token: 5 })).toBeNull();
    expect(
      readPageMessage({ source: PAGE_SOURCE, type: "token", token: "x".repeat(200), expiresAt: 1 }),
    ).toBeNull();
    expect(readPageMessage("hello")).toBeNull();
    expect(
      readExtensionMessage({ source: EXTENSION_SOURCE, type: "ready", version: "0.1.0", email: 7 }),
    ).toEqual({
      source: EXTENSION_SOURCE,
      type: "ready",
      version: "0.1.0",
      email: null,
    });
    expect(
      readExtensionMessage({ source: PAGE_SOURCE, type: "connected", email: "a@b.c" }),
    ).toBeNull();
  });
});

describe("links from the extension", () => {
  it("open Tailor and Letter on the saved post, starting only with start=1", () => {
    expect(tailorPostPath("p1", "r1")).toBe("/studio?post=p1&resume=r1&start=1");
    expect(letterPostPath("p1", null, false)).toBe("/dashboard/letters?post=p1");
    expect(savedPostBoardPath("p1")).toBe("/dashboard/applications#saved-p1");
    expect(savedPostFromHash("#saved-p1")).toBe("p1");
    expect(savedPostFromHash("#application-p1")).toBeNull();
  });
});
