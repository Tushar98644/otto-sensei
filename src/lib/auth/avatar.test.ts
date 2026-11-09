import { describe, expect, it } from "vitest";
import { googleAvatarOf } from "./avatar";

describe("the Google account picture", () => {
  it("takes Google's https picture, asked for at a sharper size", () => {
    expect(googleAvatarOf({ avatar_url: "https://lh3.googleusercontent.com/a/ACg8oc=s96-c" })).toBe(
      "https://lh3.googleusercontent.com/a/ACg8oc=s512-c",
    );
    expect(googleAvatarOf({ picture: "https://lh3.googleusercontent.com/a/x" })).toBe(
      "https://lh3.googleusercontent.com/a/x",
    );
  });

  it("ignores anything else in the metadata", () => {
    expect(googleAvatarOf({ avatar_url: "https://evil.example/me.png" })).toBeNull();
    expect(googleAvatarOf({ avatar_url: "http://lh3.googleusercontent.com/a/x" })).toBeNull();
    expect(googleAvatarOf({ avatar_url: 42 })).toBeNull();
    expect(googleAvatarOf({})).toBeNull();
    expect(googleAvatarOf(null)).toBeNull();
  });
});
