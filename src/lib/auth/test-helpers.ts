import {
  AuthApiError,
  AuthSessionMissingError,
  type AuthError,
  type AuthOtpResponse,
  type AuthResponse,
  type AuthTokenResponse,
  type OAuthResponse,
  type Session,
  type SignInWithOAuthCredentials,
  type SignInWithPasswordlessCredentials,
  type User,
  type UserResponse,
  type VerifyOtpParams,
} from "@supabase/supabase-js";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { execSql, resetDb as truncateTables } from "@/db/testing";
import type { ServerSupabase } from "@/lib/supabase/server";
import { ensureUser, toSessionUser } from "@/lib/users";
import { normalizeEmail } from "./policy";
import type { SessionUser } from "./types";

// Test-only. Stand-ins for what a route handler talks to: next/headers cookies() and Supabase Auth.
// vitest.setup.ts points @/lib/supabase/{server,admin} at the fakes below for every test; a test
// file that needs cookies adds:
//   vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

export type JarCookie = {
  name: string;
  value: string;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none" | boolean;
  secure?: boolean;
  path?: string;
  maxAge?: number;
};

type CookieAttributes = Omit<JarCookie, "name" | "value">;

const jar = new Map<string, JarCookie>();

export const cookieJar = {
  get(name: string): JarCookie | undefined {
    return jar.get(name);
  },
  getAll(): JarCookie[] {
    return [...jar.values()];
  },
  has(name: string): boolean {
    return jar.has(name);
  },
  set(name: string, value: string, attributes: CookieAttributes = {}): void {
    jar.set(name, { name, value, ...attributes });
  },
  // Like Next: a deleted cookie becomes an empty, already-expired one with the given attributes.
  delete(target: string | ({ name: string } & CookieAttributes)): void {
    const cookie = typeof target === "string" ? { name: target } : target;
    jar.set(cookie.name, { ...cookie, value: "", maxAge: 0 });
  },
  clear(): void {
    jar.clear();
  },
};

export const nextHeadersMock = { cookies: async () => cookieJar };

// The fake Supabase Auth behaves like the real service where the app depends on it: the session lives in an "sb-..."
// cookie, signing out or deleting the user revokes it (so a copied cookie stops working), codes
// are single use, and auth users are real rows in the auth.users shim, so foreign keys hold.

/** Named like a real Supabase cookie, so the app's own cookie rules apply to it. */
export const AUTH_COOKIE = "sb-test-auth-token";

type FakeMethod =
  | "getUser"
  | "signInWithOtp"
  | "verifyOtp"
  | "signInWithOAuth"
  | "exchangeCodeForSession"
  | "signOut"
  | "deleteUser";

type AuthUser = { id: string; email: string };

const state = {
  configured: true,
  adminConfigured: true,
  users: new Map<string, AuthUser>(),
  sessions: new Map<string, string>(),
  codes: new Map<string, string>(),
  oauthCodes: new Map<string, string>(),
  failures: new Map<FakeMethod, AuthError>(),
  sent: [] as { email: string; code: string; shouldCreateUser: boolean | undefined }[],
  oauthStarts: [] as SignInWithOAuthCredentials[],
};

function userObject({ id, email }: AuthUser): User {
  return {
    id,
    email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  };
}

function sessionObject(user: AuthUser, token: string): Session {
  return {
    access_token: token,
    refresh_token: `refresh-${token}`,
    expires_in: 3600,
    token_type: "bearer",
    user: userObject(user),
  };
}

function takeFailure(method: FakeMethod): AuthError | undefined {
  const failure = state.failures.get(method);
  state.failures.delete(method);
  return failure;
}

function findByEmail(email: string): AuthUser | undefined {
  return [...state.users.values()].find((user) => user.email === email);
}

async function createAuthUser(email: string): Promise<AuthUser> {
  const address = normalizeEmail(email);
  const existing = findByEmail(address);
  if (existing) return existing;
  const user = { id: crypto.randomUUID(), email: address };
  await execSql("insert into auth.users (id, email) values ($1, $2)", [user.id, user.email]);
  state.users.set(user.id, user);
  return user;
}

function startSession(user: AuthUser): string {
  const token = crypto.randomUUID();
  state.sessions.set(token, user.id);
  cookieJar.set(AUTH_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
  return token;
}

function apiError(message: string, status: number, code: string): AuthApiError {
  return new AuthApiError(message, status, code);
}

type FakeServerAuth = Pick<
  ServerSupabase["auth"],
  "getUser" | "signInWithOtp" | "verifyOtp" | "signInWithOAuth" | "exchangeCodeForSession" | "signOut"
>;

const serverAuth: FakeServerAuth = {
  async getUser(): Promise<UserResponse> {
    const failure = takeFailure("getUser");
    if (failure) return { data: { user: null }, error: failure };
    const token = cookieJar.get(AUTH_COOKIE)?.value;
    if (!token) return { data: { user: null }, error: new AuthSessionMissingError() };
    const userId = state.sessions.get(token);
    if (!userId) {
      return { data: { user: null }, error: apiError("Session does not exist", 403, "session_not_found") };
    }
    const user = state.users.get(userId);
    if (!user) return { data: { user: null }, error: apiError("User does not exist", 403, "user_not_found") };
    return { data: { user: userObject(user) }, error: null };
  },

  async signInWithOtp(credentials: SignInWithPasswordlessCredentials): Promise<AuthOtpResponse> {
    const failure = takeFailure("signInWithOtp");
    if (failure) return { data: { user: null, session: null }, error: failure };
    if (!("email" in credentials)) throw new Error("fake Supabase: only email codes are supported");
    const email = credentials.email;
    const code = String(100_000 + state.sent.length).padStart(6, "0");
    state.codes.set(email, code);
    state.sent.push({ email, code, shouldCreateUser: credentials.options?.shouldCreateUser });
    return { data: { user: null, session: null }, error: null };
  },

  async verifyOtp(params: VerifyOtpParams): Promise<AuthResponse> {
    const failure = takeFailure("verifyOtp");
    if (failure) return { data: { user: null, session: null }, error: failure };
    if (!("email" in params) || params.type !== "email") throw new Error("fake Supabase: email codes only");
    if (state.codes.get(params.email) !== params.token) {
      return {
        data: { user: null, session: null },
        error: apiError("Token has expired or is invalid", 403, "otp_expired"),
      };
    }
    state.codes.delete(params.email);
    const user = await createAuthUser(params.email);
    const token = startSession(user);
    return { data: { user: userObject(user), session: sessionObject(user, token) }, error: null };
  },

  async signInWithOAuth(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse> {
    const failure = takeFailure("signInWithOAuth");
    if (failure) return { data: { provider: credentials.provider, url: null }, error: failure };
    state.oauthStarts.push(credentials);
    cookieJar.set(`${AUTH_COOKIE}-code-verifier`, "verifier", { httpOnly: true, path: "/" });
    const url = new URL("https://project.supabase.test/auth/v1/authorize");
    url.searchParams.set("provider", credentials.provider);
    url.searchParams.set("redirect_to", credentials.options?.redirectTo ?? "");
    return { data: { provider: credentials.provider, url: url.toString() }, error: null };
  },

  async exchangeCodeForSession(code: string): Promise<AuthTokenResponse> {
    const failure = takeFailure("exchangeCodeForSession");
    if (failure) return { data: { user: null, session: null }, error: failure };
    const email = state.oauthCodes.get(code);
    if (!email || !cookieJar.get(`${AUTH_COOKIE}-code-verifier`)?.value) {
      return { data: { user: null, session: null }, error: apiError("invalid flow state", 404, "flow_state_not_found") };
    }
    state.oauthCodes.delete(code);
    cookieJar.delete(`${AUTH_COOKIE}-code-verifier`);
    const user = await createAuthUser(email);
    const token = startSession(user);
    return { data: { user: userObject(user), session: sessionObject(user, token) }, error: null };
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    const failure = takeFailure("signOut");
    if (failure) return { error: failure };
    const token = cookieJar.get(AUTH_COOKIE)?.value;
    if (token) state.sessions.delete(token);
    // The real client writes the expiring cookie through the cookie store, as here.
    if (cookieJar.has(AUTH_COOKIE)) cookieJar.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return { error: null };
  },
};

const adminAuth = {
  async deleteUser(id: string): Promise<{ data: { user: User | null }; error: AuthError | null }> {
    const failure = takeFailure("deleteUser");
    if (failure) return { data: { user: null }, error: failure };
    const user = state.users.get(id);
    if (!user) return { data: { user: null }, error: apiError("User not found", 404, "user_not_found") };
    state.users.delete(id);
    for (const [token, owner] of state.sessions) if (owner === id) state.sessions.delete(token);
    await execSql("delete from auth.users where id = $1", [id]);
    return { data: { user: userObject(user) }, error: null };
  },
};

export const supabaseServerMock = {
  createSupabaseServerClient: async () => (state.configured ? { auth: serverAuth } : null),
  supabaseAuthConfigured: () => state.configured,
};

export const supabaseAdminMock = {
  createSupabaseAdminClient: () => (state.adminConfigured ? { auth: { admin: adminAuth } } : null),
};

export const fakeAuth = {
  reset(): void {
    state.configured = true;
    state.adminConfigured = true;
    state.users.clear();
    state.sessions.clear();
    state.codes.clear();
    state.oauthCodes.clear();
    state.failures.clear();
    state.sent.length = 0;
    state.oauthStarts.length = 0;
  },
  /** As if NEXT_PUBLIC_SUPABASE_URL (or the secret key, for admin) weren't set. */
  setConfigured(configured: boolean, { admin = configured }: { admin?: boolean } = {}): void {
    state.configured = configured;
    state.adminConfigured = admin;
  },
  failNext(method: FakeMethod, error: AuthError): void {
    state.failures.set(method, error);
  },
  get sent(): readonly { email: string; code: string; shouldCreateUser: boolean | undefined }[] {
    return state.sent;
  },
  get oauthStarts(): readonly SignInWithOAuthCredentials[] {
    return state.oauthStarts;
  },
  lastCode(email?: string): string {
    const last = email ? state.sent.findLast((entry) => entry.email === email) : state.sent.at(-1);
    if (!last) throw new Error("fake Supabase: no code was sent");
    return last.code;
  },
  /** What Google would hand back to /auth/callback for this address. */
  issueOAuthCode(email: string): string {
    const code = crypto.randomUUID();
    state.oauthCodes.set(code, normalizeEmail(email));
    return code;
  },
  hasAuthUser(id: string): boolean {
    return state.users.has(id);
  },
  activeSessions(userId: string): number {
    return [...state.sessions.values()].filter((owner) => owner === userId).length;
  },
};

/** An account with our users row and its auth user, but not signed in. */
export async function createUser(email = "ada@example.com", now?: number): Promise<SessionUser> {
  const authUser = await createAuthUser(email);
  return toSessionUser(await ensureUser(authUser, now));
}

/** A users row exactly as given, plus the auth user its foreign key needs. Not signed in. */
export async function insertUserRow(row: typeof users.$inferInsert): Promise<void> {
  await execSql("insert into auth.users (id, email) values ($1, $2)", [row.id, row.email]);
  state.users.set(row.id, { id: row.id, email: row.email });
  await (await getDb()).insert(users).values(row);
}

/** Creates the account if needed and signs this cookie jar in as it, replacing any session. */
export async function signInAs(email = "ada@example.com"): Promise<SessionUser> {
  const user = await createUser(email);
  const authUser = state.users.get(user.id);
  if (!authUser) throw new Error("fake Supabase: user vanished");
  startSession(authUser);
  return user;
}

/** Empties every table and the fake auth service. Cookies are left to cookieJar.clear(). */
export async function resetDb(): Promise<void> {
  await truncateTables();
  fakeAuth.reset();
}

export function jsonRequest(
  path: string,
  body: unknown,
  { ip = "203.0.113.7", contentType = "application/json" }: { ip?: string; contentType?: string } = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": contentType, "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}
