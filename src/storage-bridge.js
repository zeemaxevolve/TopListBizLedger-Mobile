import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

/* ============================================================
   MOBILE STORAGE BRIDGE
   Implements the same window.storage.get/set/delete/list shape the
   app already uses on desktop, but backed by a single JSON file
   (STORE_FILE) inside the app's private Data directory via
   Capacitor's Filesystem plugin — sandboxed per-app storage on
   Android, not visible to other apps.

   All keys live together as one JSON object in STORE_FILE, e.g.
   { "toplist_db": "...", "other_key": "..." } — deliberately NOT
   one file per key, so that native-bridge.js's exportBackup() (which
   reads the whole store via readStoreFile()) always sees the exact
   same data get()/set() are working with. Keeping this single source
   of truth is what avoids a class of bug where a bridge silently
   reads from a different place than the app writes to.

   Writes go through a temp-file-then-copy-then-delete pattern so a
   crash mid-write can't easily leave the real file corrupted — the
   temp file is fully written and verified readable before it ever
   touches the real path.
   ============================================================ */

export const STORE_FILE = "toplist-mobile-storage.json";

export async function readStoreFile() {
  try {
    const result = await Filesystem.readFile({ path: STORE_FILE, directory: Directory.Data, encoding: Encoding.UTF8 });
    return JSON.parse(result.data);
  } catch {
    return {};
  }
}

async function writeStoreFile(store) {
  const json = JSON.stringify(store);
  const tmpPath = `${STORE_FILE}.tmp`;
  await Filesystem.writeFile({ path: tmpPath, directory: Directory.Data, data: json, encoding: Encoding.UTF8 });
  // Verify the temp write actually succeeded and is readable before
  // touching the real file, then copy its content over.
  const verify = await Filesystem.readFile({ path: tmpPath, directory: Directory.Data, encoding: Encoding.UTF8 });
  await Filesystem.writeFile({ path: STORE_FILE, directory: Directory.Data, data: verify.data, encoding: Encoding.UTF8 });
  await Filesystem.deleteFile({ path: tmpPath, directory: Directory.Data }).catch(() => {});
}

export function installMobileStorageBridge() {
  window.storage = {
    async get(key, shared = false) {
      const store = await readStoreFile();
      if (!(key in store)) return null;
      return { key, value: store[key], shared: !!shared };
    },

    async set(key, value, shared = false) {
      try {
        const store = await readStoreFile();
        store[key] = value;
        await writeStoreFile(store);
        return { key, value, shared: !!shared };
      } catch {
        return null;
      }
    },

    async delete(key, shared = false) {
      try {
        const store = await readStoreFile();
        if (!(key in store)) return null;
        delete store[key];
        await writeStoreFile(store);
        return { key, deleted: true, shared: !!shared };
      } catch {
        return null;
      }
    },

    async list(prefix = "", shared = false) {
      const store = await readStoreFile();
      const keys = Object.keys(store).filter((k) => k.startsWith(prefix));
      return { keys, prefix, shared: !!shared };
    },
  };
}
