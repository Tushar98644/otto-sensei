import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, isProduction, supabaseConfig, supabaseSecretKey } from "@/lib/env";
import { log } from "@/lib/log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MEDIA_KEY } from "./content";
import { MEDIA_LIMITS } from "./media";

// Server-only. Where uploaded portfolio pictures are kept.
//   supabase: the public "portfolio-media" Storage bucket. Anyone may read a file (the pages are
//             public), only this server writes, with the secret key. Created on first upload when
//             missing; SETUP.md has the manual steps.
//   local:    web/.uploads, served by /api/portfolio/media/dev/<key>. Development only.

export const MEDIA_BUCKET = "portfolio-media";
export const DEV_MEDIA_PATH = "/api/portfolio/media/dev/";
// Files never change under a key (a new upload gets a new key), so browsers may keep them.
const CACHE_SECONDS = 60 * 60 * 24 * 365;

export type MediaStore = {
  name: "supabase" | "local" | "memory";
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
  // The address pages load the file from; every key under it is `${base}${key}`.
  base: string;
};

function supabaseStore(): MediaStore | null {
  const config = supabaseConfig();
  const client = createSupabaseAdminClient();
  if (!config || !client) return null;
  const admin = client;
  let bucketChecked = false;
  const bucket = () => admin.storage.from(MEDIA_BUCKET);

  async function ensureBucket(): Promise<void> {
    if (bucketChecked) return;
    const { error } = await admin.storage.getBucket(MEDIA_BUCKET);
    if (error) {
      const created = await admin.storage.createBucket(MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: MEDIA_LIMITS.maxUploadBytes,
        allowedMimeTypes: ["image/webp"],
      });
      // Two first uploads at once both try; the loser's "already exists" is fine.
      if (created.error && !/exist/i.test(created.error.message)) throw created.error;
      log.info("portfolio.media_bucket_created", {});
    }
    bucketChecked = true;
  }

  return {
    name: "supabase",
    base: `${config.url.replace(/\/+$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/`,
    async put(key, bytes, contentType) {
      await ensureBucket();
      const { error } = await bucket().upload(key, bytes, {
        contentType,
        cacheControl: String(CACHE_SECONDS),
        upsert: false,
      });
      if (error) throw new Error("Supabase Storage refused the upload", { cause: error });
    },
    async remove(keys) {
      // The Storage API takes at most 1,000 names per call; an account holds far fewer.
      for (let i = 0; i < keys.length; i += 1000) {
        const { error } = await bucket().remove(keys.slice(i, i + 1000) as string[]);
        if (error) throw new Error("Supabase Storage refused the delete", { cause: error });
      }
    },
  };
}

export function localMediaDir(): string {
  return path.join(process.cwd(), ".uploads");
}

/** The file on disk for a key, or null for anything that isn't one of ours (no "../" tricks). */
export function localMediaPath(key: string): string | null {
  if (!MEDIA_KEY.test(key)) return null;
  return path.join(localMediaDir(), ...key.split("/"));
}

function localStore(): MediaStore {
  return {
    name: "local",
    base: DEV_MEDIA_PATH,
    async put(key, bytes) {
      const file = localMediaPath(key);
      if (!file) throw new Error("bad media key");
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: "wx" });
    },
    async remove(keys) {
      for (const key of keys) {
        const file = localMediaPath(key);
        if (file) await rm(file, { force: true });
      }
    },
  };
}

export async function readLocalMedia(key: string): Promise<Uint8Array | null> {
  const file = localMediaPath(key);
  if (!file) return null;
  try {
    // Development only (web/.uploads). The ignore keeps Turbopack from tracing the whole project
    // into the server bundle for a path it can't resolve.
    return new Uint8Array(await readFile(/*turbopackIgnore: true*/ file));
  } catch {
    return null;
  }
}

let override: MediaStore | null = null;

/** The store this deployment uses, or null when uploads can't work here (production, no key). */
export function mediaStore(): MediaStore | null {
  if (override) return override;
  const wanted = env().PORTFOLIO_MEDIA_STORE;
  if (wanted === "local") return isProduction() ? null : localStore();
  const supabase = supabaseConfig() && supabaseSecretKey() ? supabaseStore() : null;
  if (wanted === "supabase" || supabase) return supabase;
  return isProduction() ? null : localStore();
}

/** Test-only: an in-memory store that records what was written and deleted. */
export function memoryMediaStore(): MediaStore & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    name: "memory",
    base: "https://media.test/",
    files,
    async put(key, bytes) {
      if (files.has(key)) throw new Error("exists");
      files.set(key, bytes);
    },
    async remove(keys) {
      for (const key of keys) files.delete(key);
    },
  };
}

export function setMediaStoreForTests(store: MediaStore | null): void {
  override = store;
}

/** The public address of a stored file. */
export function mediaUrlFor(store: Pick<MediaStore, "base">, key: string): string {
  return `${store.base}${key}`;
}

/** Where this deployment's pages load uploads from, "" when uploads are off. */
export function mediaBase(): string {
  return mediaStore()?.base ?? "";
}
