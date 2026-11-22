import { describe, expect, it } from "vitest";
import { JOB_MATCHES, manifest } from "./manifest";

describe("the extension's manifest", () => {
  it("asks for storage, activeTab and scripting, the job sites and Otto, and nothing broader", () => {
    const prod = manifest("prod", "1.2.3");
    expect(prod.permissions).toEqual(["storage", "activeTab", "scripting"]);
    expect(prod.host_permissions).toEqual([...JOB_MATCHES, "https://www.ottosensei.com/*"]);
    expect(JSON.stringify(prod)).not.toMatch(/<all_urls>|\*:\/\/\*\/\*|https:\/\/\*\/\*/);
    expect(prod).not.toHaveProperty("key");
    expect(prod.version).toBe("1.2.3");
  });

  it("runs on LinkedIn's job pages only, and inside Greenhouse frames", () => {
    expect(JOB_MATCHES.filter((match) => match.includes("linkedin"))).toEqual([
      "https://www.linkedin.com/jobs/*",
    ]);
    const frames = manifest("prod", "1").content_scripts.find((script) => "all_frames" in script);
    expect(frames?.matches.every((match) => match.includes("greenhouse"))).toBe(true);
  });

  it("points the dev build at the local server with its pinned id", () => {
    const dev = manifest("dev", "1");
    expect(dev.host_permissions).toContain("http://localhost:3314/*");
    expect(dev).toHaveProperty("key");
  });
});
