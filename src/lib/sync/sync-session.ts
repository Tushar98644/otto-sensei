import type { CloudSync } from "./cloud-sync";

// One backup session per account for the whole tab, so moving between dashboard and studio doesn't
// re-read every resume. Ends when the account changes, signs out, or the server ends it.
export type SyncSession = {
  acquire: (userId: string | null) => CloudSync;
  current: () => CloudSync | null;
  end: () => void;
};

export function createSyncSession(
  start: (userId: string | null) => CloudSync,
  // So a long-open tab still brings in resumes changed on other devices.
  rereadAfterMs: number,
): SyncSession {
  let session: { userId: string | null; sync: CloudSync } | null = null;
  return {
    acquire(userId) {
      if (session && session.userId === userId && !session.sync.isStopped()) {
        void session.sync.refresh(rereadAfterMs);
        return session.sync;
      }
      session?.sync.stop();
      const sync = start(userId);
      session = { userId, sync };
      return sync;
    },
    current: () => session?.sync ?? null,
    end() {
      session?.sync.stop();
      session = null;
    },
  };
}
