import { bigint, integer, pgSchema, text, uuid } from "drizzle-orm/pg-core";

// Tables only in the local and test databases: a stand-in for Supabase's auth.users (the
// migrations' foreign key points at it), and dev sign-in codes and sessions.

export const LOCAL_ONLY_DDL = `
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key, email text);
  create index if not exists users_email_idx on auth.users (email);

  create schema if not exists dev_auth;
  create table if not exists dev_auth.login_codes (
    email text primary key,
    code_hash text not null,
    expires_at bigint not null,
    attempts integer not null default 0
  );
  create table if not exists dev_auth.sessions (
    id text primary key,
    user_id uuid not null,
    created_at bigint not null,
    expires_at bigint not null
  );
  create index if not exists sessions_user_idx on dev_auth.sessions (user_id);
`;

export const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
});

const devAuth = pgSchema("dev_auth");

export const devLoginCodes = devAuth.table("login_codes", {
  email: text("email").primaryKey(),
  codeHash: text("code_hash").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  attempts: integer("attempts").notNull().default(0),
});

export const devSessions = devAuth.table("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
