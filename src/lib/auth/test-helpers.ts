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
  type UserIdentity,
  type UserResponse,
  type VerifyOtpParams,
} from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
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
  | "deleteUser"
  | "linkIdentity"
  | "getUserIdentities"
  | "unlinkIdentity";

// `github`: the linked GitHub login. `githubOnly`: made by signing in with GitHub, so it has no
// email identity and GitHub is its only way in.
type AuthUser = { id: string; email: string; github: string | null; githubOnly?: boolean };

// What a provider hands back to /auth/callback: a sign-in (Google, or GitHub with `github`), or
// GitHub linked to an existing account.
type OAuthGrant = { email: string; github?: string } | { linkTo: string; github: string };

const state = {
  configured: true,
  adminConfigured: true,
  users: new Map<string, AuthUser>(),
  sessions: new Map<string, string>(),
  codes: new Map<string, string>(),
  oauthCodes: new Map<string, OAuthGrant>(),
  failures: new Map<FakeMethod, AuthError>(),
  sent: [] as { email: string; code: string; shouldCreateUser: boolean | undefined }[],
  oauthStarts: [] as SignInWithOAuthCredentials[],
  linkStarts: [] as SignInWithOAuthCredentials[],
};

function identity(user: AuthUser, provider: string, data: Record<string, unknown>): UserIdentity {
  return {
    id: String(data.sub),
    identity_id: `${provider}-${user.id}`,
    user_id: user.id,
    provider,
    identity_data: data,
  };
}

// Shaped like Supabase's: GitHub's login sits in user_name and preferred_username.
function identitiesOf(user: AuthUser): UserIdentity[] {
  const list = user.githubOnly ? [] : [identity(user, "email", { sub: user.id, email: user.email })];
  if (user.github) {
    const login = user.github;
    list.push(identity(user, "github", { sub: `gh-${login.toLowerCase()}`, user_name: login, preferred_username: login }));
  }
  return list;
}

function userObject(user: AuthUser): User {
  return {
    id: user.id,
    email: user.email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: user.githubOnly ? "github" : "email" },
    user_metadata: {},
    identities: identitiesOf(user),
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

async function createAuthUser(email: string, githubOnly?: string): Promise<AuthUser> {
  const address = normalizeEmail(email);
  const existing = findByEmail(address);
  if (existing) return existing;
  const user: AuthUser = githubOnly
    ? { id: crypto.randomUUID(), email: address, github: githubOnly, githubOnly: true }
    : { id: crypto.randomUUID(), email: address, github: null };
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
  | "getUser"
  | "signInWithOtp"
  | "verifyOtp"
  | "signInWithOAuth"
  | "exchangeCodeForSession"
  | "signOut"
  | "getUserIdentities"
  | "unlinkIdentity"
> & {
  // Only the OAuth overload: the app never links with an ID token.
  linkIdentity: (credentials: SignInWithOAuthCredentials) => Promise<OAuthResponse>;
};

// The signed-in auth user, or why there is none, as getUser() reports it.
function sessionUser(): { user: AuthUser; error: null } | { user: null; error: AuthError } {
  const token = cookieJar.get(AUTH_COOKIE)?.value;
  if (!token) return { user: null, error: new AuthSessionMissingError() };
  const userId = state.sessions.get(token);
  if (!userId) return { user: null, error: apiError("Session does not exist", 403, "session_not_found") };
  const user = state.users.get(userId);
  if (!user) return { user: null, error: apiError("User does not exist", 403, "user_not_found") };
  return { user, error: null };
}

function startOAuth(path: string, credentials: SignInWithOAuthCredentials): OAuthResponse {
  cookieJar.set(`${AUTH_COOKIE}-code-verifier`, "verifier", { httpOnly: true, path: "/" });
  const url = new URL(`https://project.supabase.test/auth/v1${path}`);
  url.searchParams.set("provider", credentials.provider);
  url.searchParams.set("redirect_to", credentials.options?.redirectTo ?? "");
  return { data: { provider: credentials.provider, url: url.toString() }, error: null };
}

// Like Supabase: a GitHub account belongs to one user, and the same verified email is one user.
async function grantUser(grant: OAuthGrant): Promise<AuthUser | AuthError> {
  const taken = (login: string, owner?: string) =>
    [...state.users.values()].some((user) => user.id !== owner && user.github?.toLowerCase() === login.toLowerCase());
  if ("linkTo" in grant) {
    const user = state.users.get(grant.linkTo);
    if (!user) return apiError("User not found", 404, "user_not_found");
    if (taken(grant.github, user.id)) {
      return apiError("Identity is already linked to another user", 422, "identity_already_exists");
    }
    user.github = grant.github;
    return user;
  }
  const user = await createAuthUser(grant.email, grant.github);
  if (grant.github && !user.github && !taken(grant.github)) user.github = grant.github;
  return user;
}

const serverAuth: FakeServerAuth = {
  async getUser(): Promise<UserResponse> {
    const failure = takeFailure("getUser");
    if (failure) return { data: { user: null }, error: failure };
    const { user, error } = sessionUser();
    if (error) return { data: { user: null }, error };
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
    return startOAuth("/authorize", credentials);
  },

  async linkIdentity(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse> {
    const failure = takeFailure("linkIdentity");
    if (failure) return { data: { provider: credentials.provider, url: null }, error: failure };
    const { error } = sessionUser();
    if (error) return { data: { provider: credentials.provider, url: null }, error };
    state.linkStarts.push(credentials);
    return startOAuth("/user/identities/authorize", credentials);
  },

  async getUserIdentities() {
    const failure = takeFailure("getUserIdentities");
    if (failure) return { data: null, error: failure };
    const { user, error } = sessionUser();
    if (error) return { data: null, error };
    return { data: { identities: identitiesOf(user) }, error: null };
  },

  async unlinkIdentity(target: UserIdentity) {
    const failure = takeFailure("unlinkIdentity");
    if (failure) return { data: null, error: failure };
    const { user, error } = sessionUser();
    if (error) return { data: null, error };
    if (target.user_id !== user.id || target.provider !== "github" || !user.github) {
      return { data: null, error: apiError("Identity doesn't exist", 404, "identity_not_found") };
    }
    if (identitiesOf(user).length < 2) {
      return { data: null, error: apiError("User must have at least 1 identity after unlinking", 422, "single_identity_not_deletable") };
    }
    user.github = null;
    return { data: {}, error: null };
  },

  async exchangeCodeForSession(code: string): Promise<AuthTokenResponse> {
    const failure = takeFailure("exchangeCodeForSession");
    if (failure) return { data: { user: null, session: null }, error: failure };
    const grant = state.oauthCodes.get(code);
    if (!grant || !cookieJar.get(`${AUTH_COOKIE}-code-verifier`)?.value) {
      return { data: { user: null, session: null }, error: apiError("invalid flow state", 404, "flow_state_not_found") };
    }
    state.oauthCodes.delete(code);
    cookieJar.delete(`${AUTH_COOKIE}-code-verifier`);
    const user = await grantUser(grant);
    if (!("id" in user)) return { data: { user: null, session: null }, error: user };
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
    state.linkStarts.length = 0;
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
  get linkStarts(): readonly SignInWithOAuthCredentials[] {
    return state.linkStarts;
  },
  lastCode(email?: string): string {
    const last = email ? state.sent.findLast((entry) => entry.email === email) : state.sent.at(-1);
    if (!last) throw new Error("fake Supabase: no code was sent");
    return last.code;
  },
  /**
   * What Google would hand back to /auth/callback for this address; with `github`, a sign-in with
   * that GitHub account instead (a new account with GitHub as its only way in).
   */
  issueOAuthCode(email: string, { github }: { github?: string } = {}): string {
    const code = crypto.randomUUID();
    state.oauthCodes.set(code, { email: normalizeEmail(email), github });
    return code;
  },
  /** What GitHub would hand back to /auth/callback after linking `login` to this account. */
  issueLinkCode(userId: string, login: string): string {
    const code = crypto.randomUUID();
    state.oauthCodes.set(code, { linkTo: userId, github: login });
    return code;
  },
  githubOf(userId: string): string | null {
    return state.users.get(userId)?.github ?? null;
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
  state.users.set(row.id, { id: row.id, email: row.email, github: null });
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

/** Links a GitHub login to the account, as "Connect GitHub" would. */
export function linkGitHub(user: Pick<SessionUser, "id">, login: string): void {
  const authUser = state.users.get(user.id);
  if (!authUser) throw new Error("fake Supabase: no such user");
  authUser.github = login;
}

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Puts the account on a plan, the way a webhook would. "trial" is Pro monthly on its free trial,
 * ending `trialEndsAt` (3 days from now unless given): the smallest real AI allowance, so tests
 * that count to a limit stay short. Free has no AI allowance at all.
 */
export async function setPlan(
  user: SessionUser,
  plan: "pro" | "max" | "trial",
  trialEndsAt = Date.now() + TRIAL_MS,
): Promise<SessionUser> {
  const trial = plan === "trial";
  const [row] = await (await getDb())
    .update(users)
    .set({
      plan: trial ? "pro" : plan,
      planInterval: "month",
      planStatus: trial ? "trialing" : "active",
      planRenewsAt: trial ? trialEndsAt : null,
      trialEndsAt: trial ? trialEndsAt : null,
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!row) throw new Error("setPlan: no such user");
  return toSessionUser(row);
}

/** signInAs(), then the account on Pro's free trial (see setPlan). */
export async function signInOnTrial(email = "ada@example.com", trialEndsAt?: number): Promise<SessionUser> {
  return setPlan(await signInAs(email), "trial", trialEndsAt);
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
