import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, resumes, resumeTombstones, usage, users } from "@/db/schema";
import { execSql } from "@/db/testing";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { deleteUserData, ensureUser, findUserById, toSessionUser } from "./users";

const NOW = Date.UTC(2026, 10, 6, 12);

async function authUser(email: string): Promise<{ id: string; email: string }> {
  const id = crypto.randomUUID();
  await execSql("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  return { id, email };
}

async function seedAccountData(userId: string) {
  const db = await getDb();
  await db.insert(resumes).values([
    { userId, id: "r1", data: sampleData("r1"), createdAt: NOW, updatedAt: NOW },
    { userId, id: "r2", data: sampleData("r2"), createdAt: NOW, updatedAt: NOW },
  ]);
  await db.insert(resumeTombstones).values({ userId, id: "r0", deletedAt: NOW });
  await db.insert(applications).values(
    ["Stripe", "Linear", "Figma"].map((company) => ({
      id: crypto.randomUUID(),
      userId,
      resumeId: "r1",
      company,
      appliedAt: NOW,
      statusChangedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    })),
  );
  await db.insert(usage).values({ subject: userId, feature: "fix", period: "2026-11", count: 4 });
}

// Only deletion is under test here, so the stored shape doesn't matter.
function sampleData(id: string) {
  return { id } as unknown as typeof resumes.$inferInsert.data;
}

async function countRows(userId: string) {
  const db = await getDb();
  const [resumeRows, tombstoneRows, applicationRows, usageRows, userRows] = await Promise.all([
    db.select().from(resumes).where(eq(resumes.userId, userId)),
    db.select().from(resumeTombstones).where(eq(resumeTombstones.userId, userId)),
    db.select().from(applications).where(eq(applications.userId, userId)),
    db.select().from(usage).where(eq(usage.subject, userId)),
    db.select().from(users).where(eq(users.id, userId)),
  ]);
  return {
    resumes: resumeRows.length,
    tombstones: tombstoneRows.length,
    applications: applicationRows.length,
    usage: usageRows.length,
    users: userRows.length,
  };
}

beforeEach(resetDb);

describe("ensureUser", () => {
  it("creates a free account for the auth user with the normalized address, then reuses it", async () => {
    const identity = await authUser("ada@example.com");
    const created = await ensureUser({ ...identity, email: "  Ada@Example.COM " }, NOW);
    expect(created).toMatchObject({ id: identity.id, email: "ada@example.com", plan: "free", createdAt: NOW });
    const again = await ensureUser({ ...identity, email: "ada@EXAMPLE.com" }, NOW + 1);
    expect(again).toEqual(created);
  });

  it("takes on a changed address without touching the plan", async () => {
    const identity = await authUser("ada@example.com");
    await ensureUser(identity, NOW);
    const db = await getDb();
    await db.update(users).set({ plan: "pro" }).where(eq(users.id, identity.id));
    const moved = await ensureUser({ ...identity, email: "ada@new.example" }, NOW + 5);
    expect(moved).toMatchObject({ email: "ada@new.example", plan: "pro", createdAt: NOW, updatedAt: NOW + 5 });
  });

  it("creates one row when first requests race", async () => {
    const identity = await authUser("ada@example.com");
    const results = await Promise.all([1, 2, 3, 4].map(() => ensureUser(identity, NOW)));
    expect(new Set(results.map((user) => user.id))).toEqual(new Set([identity.id]));
    const db = await getDb();
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("lets a new person sign up with an address a stale row still holds", async () => {
    const first = await authUser("old@example.com");
    await ensureUser(first, NOW);
    const second = await authUser("ada@example.com");
    const created = await ensureUser({ ...second, email: "old@example.com" }, NOW);
    expect(created.id).toBe(second.id);
  });

  it("refuses an id Supabase Auth doesn't know", async () => {
    await expect(ensureUser({ id: crypto.randomUUID(), email: "ghost@example.com" })).rejects.toThrow();
  });
});

describe("findUserById", () => {
  it("returns the row, or null for an unknown or malformed id", async () => {
    const created = await createUser("grace@example.com", NOW);
    expect(await findUserById(created.id)).toMatchObject(created);
    expect(await findUserById(crypto.randomUUID())).toBeNull();
    expect(await findUserById("missing")).toBeNull();
  });
});

describe("toSessionUser", () => {
  it("keeps only what the session needs", async () => {
    const created = await createUser("linus@example.com", NOW);
    const row = await findUserById(created.id);
    if (!row) throw new Error("user missing");
    expect(
      toSessionUser({
        ...row,
        plan: "pro",
        planInterval: "week",
        planRenewsAt: NOW + 1000,
        billingCustomerId: "cus_1",
      }),
    ).toEqual({
      id: row.id,
      email: "linus@example.com",
      plan: "pro",
      planInterval: "week",
      planRenewsAt: NOW + 1000,
      trialEndsAt: null,
      planPeriodStartsAt: null,
      planPeriodEndsAt: null,
    });
  });
});

describe("deleteUserData", () => {
  it("removes the account and everything under it, and nothing else", async () => {
    const ada = await createUser("ada@example.com", NOW);
    const grace = await createUser("grace@example.com", NOW);
    await seedAccountData(ada.id);
    await seedAccountData(grace.id);

    await deleteUserData(ada.id);

    expect(await countRows(ada.id)).toEqual({ resumes: 0, tombstones: 0, applications: 0, usage: 0, users: 0 });
    expect(await countRows(grace.id)).toEqual({ resumes: 2, tombstones: 1, applications: 3, usage: 1, users: 1 });
  });

  it("is a no-op for an unknown or already deleted id", async () => {
    const ada = await createUser("ada@example.com", NOW);
    await deleteUserData(ada.id);
    await expect(deleteUserData(ada.id)).resolves.toBeUndefined();
    await expect(deleteUserData("missing")).resolves.toBeUndefined();
  });

  it("happens on its own when the auth user is deleted in Supabase", async () => {
    const ada = await createUser("ada@example.com", NOW);
    await seedAccountData(ada.id);
    await execSql("delete from auth.users where id = $1", [ada.id]);
    expect(await countRows(ada.id)).toEqual({ resumes: 0, tombstones: 0, applications: 0, usage: 0, users: 0 });
  });
});
