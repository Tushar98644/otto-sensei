import type { CloudSync } from "./cloud-sync";

// One backup session per account for the whole tab. The dashboard and the studio each mount the
// sync hook, and moving between them used to start a new session that read every resume in the
// account again. Now the session outlives both and ends only when the account changes, it signs
// out, or the server ends it.
export type SyncSession = {
  // The account's running session, or a new one for it (stopping any other account's).
  acquire: (userId: string | null) => CloudSync;
  current: () => CloudSync | null;
  end: () => void;
};

export function createSyncSession(
  start: (userId: string | null) => CloudSync,
  // A session picked up again re-reads the account after this long, so a tab left open still
  // brings in resumes changed on other devices when the person moves on.
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
