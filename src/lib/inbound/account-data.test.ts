import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { inboundEmails, inboundHandles, users, userSettings } from "@/db/schema";
import { buildDataExport } from "@/lib/account/data-export";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { deleteUserData } from "@/lib/users";
import { receiveEmail } from "./apply";
import { checkHandle, claimHandle, recipientOf } from "./handles";
import { gmailForward, loadFixture, useInboundSecrets } from "./inbound-testing";

const NOW = Date.UTC(2026, 10, 20, 12);
const GMAIL = "priya.sharma@gmail.com";

async function tracked(email: string, handle: string) {
  const user = await createUser(email);
  const db = await getDb();
  await db.update(users).set({ plan: "pro" }).where(eq(users.id, user.id));
  expect(await claimHandle(user.id, handle, NOW)).toBe("ok");
  await db
    .update(userSettings)
    .set({ trackingSources: [GMAIL] })
    .where(eq(userSettings.userId, user.id));
  const to = `otto+${handle}@track.ottosensei.com`;
  const recipient = (await recipientOf(handle, NOW))!;
  const mail = loadFixture("greenhouse-applied.txt");
  const auth = gmailForward(GMAIL, to);
  await receiveEmail(
    recipient,
    {
      v: 1,
      to,
      truncated: false,
      ...mail,
      messageId: "<a@b>",
      envelopeFrom: auth.envelopeFrom!,
      auth: { dkim: [], arc: auth.arc! },
    },
    NOW,
  );
  return { user, to };
}

beforeEach(async () => {
  await resetDb();
  useInboundSecrets();
});

afterEach(() => useInboundSecrets(false));

describe("the account's email tracking data", () => {
  it("is in the data download: the address, the confirmed Gmail and what was read, never the email", async () => {
    const { user, to } = await tracked("priya@example.com", "priya");
    await tracked("rahul@example.com", "rahul");
    const zip = await JSZip.loadAsync(await buildDataExport(user.id, NOW));
    const file = JSON.parse((await zip.file("email-tracking.json")?.async("string")) ?? "null");
    expect(file.address.addresses).toEqual([
      { handle: "priya", createdAt: NOW, retiredAt: null, address: to },
    ]);
    expect(file.address.confirmedGmail).toEqual([GMAIL]);
    expect(file.emails).toHaveLength(1);
    expect(file.emails[0]).toMatchObject({
      kind: "applied",
      company: "Northwind",
      change: "created",
      trust: "source",
    });
    expect(JSON.stringify(file)).not.toContain("recruiter will reach out");
    expect(await zip.file("README.txt")?.async("string")).toContain("email-tracking.json");
  });

  it("goes with the account, while the handle stays held from anyone else", async () => {
    const { user } = await tracked("priya@example.com", "priya");
    const other = await tracked("rahul@example.com", "rahul");
    await deleteUserData(user.id);
    const db = await getDb();
    expect((await db.select().from(userSettings)).map((row) => row.userId)).toEqual([
      other.user.id,
    ]);
    expect((await db.select().from(inboundEmails)).map((row) => row.userId)).toEqual([
      other.user.id,
    ]);
    const [held] = await db.select().from(inboundHandles).where(eq(inboundHandles.handle, "priya"));
    expect(held?.userId).toBeNull();
    expect(await recipientOf("priya", NOW)).toBeNull();
    expect(await checkHandle(other.user.id, "priya", NOW)).toEqual({
      available: false,
      problem: "taken",
    });
  });
});
