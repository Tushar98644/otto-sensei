import { describe, expect, it } from "vitest";
import type { EmailEvent, TrackingAddress } from "@/lib/inbound/types";
import { emailedCards } from "./use-email-tracking";
import { canUndo, changeLine, proposalLine, setupStage } from "./view";

const ADDRESS: TrackingAddress = {
  email: "otto+priya@track.ottosensei.com",
  handle: "priya",
  sources: [],
  createdAt: 1,
  confirm: null,
  confirmedAt: null,
  testAt: null,
  lastEmailAt: null,
};

function event(overrides: Partial<EmailEvent> = {}): EmailEvent {
  return {
    id: "e1",
    receivedAt: 1_000,
    sender: "greenhouse-mail.io",
    subject: "Update on your application",
    kind: "rejected",
    system: "greenhouse",
    company: "Northwind",
    role: "Designer",
    eventAt: null,
    eventText: "",
    trust: "source",
    proposal: null,
    applicationId: "a1",
    change: "moved",
    fromStatus: "applied",
    toStatus: "rejected",
    undoneAt: null,
    ...overrides,
  };
}

describe("the setup card", () => {
  it("walks from waiting, to Gmail's confirmation, to the filter, to working", () => {
    expect(setupStage(ADDRESS)).toBe("address");
    const asked = {
      ...ADDRESS,
      confirm: {
        code: "1",
        url: "https://mail.google.com/mail/vf-x",
        at: 2,
        source: "p@gmail.com",
      },
    };
    expect(setupStage(asked)).toBe("confirm");
    expect(setupStage({ ...asked, confirmedAt: 3 })).toBe("filter");
    expect(setupStage({ ...asked, confirmedAt: 3, lastEmailAt: 4 })).toBe("working");
  });
});

describe("the activity list", () => {
  it("says what each email did", () => {
    expect(changeLine(event())).toBe("Moved to Rejected");
    expect(changeLine(event({ change: "created", fromStatus: null, toStatus: "applied" }))).toBe(
      "Added to Applied",
    );
    expect(changeLine(event({ change: "none", kind: "applied", toStatus: "applied" }))).toBe(
      "Already on your board",
    );
    expect(changeLine(event({ undoneAt: 5 }))).toBe("Undone");
  });

  it("says what Apply would do for an email waiting to be checked", () => {
    const pending = (change: "created" | "moved" | "none") =>
      event({
        change: "pending",
        proposal: {
          change,
          applicationId: "a1",
          company: "Northwind",
          fromStatus: "applied",
          toStatus: "rejected",
        },
      });
    expect(proposalLine(pending("moved"))).toBe("Move Northwind to Rejected");
    expect(proposalLine(pending("created"))).toBe("Add Northwind to Rejected");
    expect(proposalLine(pending("none"))).toBe(
      "Northwind is already in Rejected, so nothing would change",
    );
    expect(canUndo(pending("moved"))).toBe(false);
  });

  it("offers Undo only for a change that still stands", () => {
    expect(canUndo(event())).toBe(true);
    expect(canUndo(event({ undoneAt: 5 }))).toBe(false);
    expect(canUndo(event({ change: "none" }))).toBe(false);
  });

  it("marks cards an email changed in the last month", () => {
    const tracking = {
      available: true,
      allowed: true,
      parts: { before: "otto+", after: "@track.ottosensei.com" },
      suggestion: "",
      address: ADDRESS,
      events: [
        event({ id: "1", applicationId: "fresh", receivedAt: 40 * 86_400_000 }),
        event({ id: "2", applicationId: "old", receivedAt: 1 }),
        event({ id: "3", applicationId: "undone", receivedAt: 40 * 86_400_000, undoneAt: 1 }),
        event({ id: "4", applicationId: "same", receivedAt: 40 * 86_400_000, change: "none" }),
      ],
    };
    expect([...emailedCards(tracking, 41 * 86_400_000)]).toEqual(["fresh"]);
  });
});
