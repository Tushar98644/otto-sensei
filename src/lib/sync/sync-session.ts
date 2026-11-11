import type { CloudSync } from "./cloud-sync";

export type SyncSession = {
  acquire: (userId: string | null) => CloudSync;
  current: () => CloudSync | null;
  end: () => void;
};

export function createSyncSession(
  start: (userId: string | null) => CloudSync,
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
