import { beforeEach, describe, expect, it } from "vitest";
import { buildDataExport } from "@/lib/account/data-export";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { careerLogJson, careerLogText } from "./export";
import { saveEntry } from "./records";
import type { CareerLogEntry } from "./types";

const NOW = Date.UTC(2026, 10, 22, 12);

const entry = (month: string, fields: Partial<CareerLogEntry>): CareerLogEntry => ({
  id: month,
  month,
  shipped: "",
  numbers: "",
  learned: "",
  nothingNew: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...fields,
});

describe("the career log export", () => {
  it("reads as plain text, newest month first, with each prompt it answers", () => {
    const text = careerLogText(
      [
        entry("2026-10", { nothingNew: true }),
        entry("2026-11", { shipped: "Rebuilt signup", numbers: "Signups up 18%" }),
      ],
      "2026-11-22",
    );
    expect(text).toBe(
      [
        "Career log, downloaded on 2026-11-22.",
        "2 months.",
        "",
        "November 2026",
        "=============",
        "",
        "What did you ship or improve?",
        "Rebuilt signup",
        "",
        "Any numbers?",
        "Signups up 18%",
        "",
        "October 2026",
        "============",
        "Nothing new this month.",
        "",
      ].join("\n"),
    );
  });

  it("keeps every field in the JSON, oldest first", () => {
    const rows = JSON.parse(
      careerLogJson([
        entry("2026-11", { learned: "Led standups" }),
        entry("2026-09", { shipped: "x" }),
      ]),
    ) as { month: string; learned: string }[];
    expect(rows.map((row) => row.month)).toEqual(["2026-09", "2026-11"]);
    expect(rows[1]).toMatchObject({
      learned: "Led standups",
      updatedAt: "2026-11-22T12:00:00.000Z",
    });
  });
});

describe("the account's data export", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("includes the career log once there is one", async () => {
    const maya = await createUser("maya@example.com");
    const empty = await buildDataExport(maya.id, NOW);
    expect(empty.file("career-log.txt")).toBeNull();

    await saveEntry(maya.id, "2026-11", { shipped: "Rebuilt signup" }, NOW);
    const zip = await buildDataExport(maya.id, NOW);
    expect(await zip.file("career-log.txt")?.async("string")).toContain("Rebuilt signup");
    expect(await zip.file("career-log.json")?.async("string")).toContain('"month": "2026-11"');
    expect(await zip.file("README.txt")?.async("string")).toContain(
      "career-log.txt and career-log.json: your career log, 1 month.",
    );
  });
});
