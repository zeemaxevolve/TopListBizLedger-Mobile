import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { STORE_FILE, readStoreFile } from "./storage-bridge.js";

/* ============================================================
   MOBILE NATIVE BRIDGE
   Provides the same window.toplistNative shape the app already
   calls on desktop — exportBackup / pickMergeFile / importBackup /
   sharePDF — adapted to what's actually available on Android.

   IMPORTANT: this is named "toplistNative" (not "zeemaxNative") to
   exactly match TopList's own desktop preload.js and app code, which
   already use that name consistently. Keeping this name aligned with
   the desktop app is what makes window.toplistNative?.platform ===
   "android" checks in TopListERP.jsx actually resolve to true on this
   platform — a mismatch here silently breaks PDF sharing, merge, and
   backup detection, exactly as happened once already in a different
   sibling app.

   - Export: writes a backup file into the app's Cache directory, then
     hands it to the OS Share sheet — the person picks where it goes.
   - Merge / Import: use a hidden HTML file input, which Android
     already renders as its own native file/document picker.
   - sharePDF: writes the generated PDF into Cache, then shares it —
     this is the mobile equivalent of desktop's "Download PDF" button,
     since there's no browser-style file download on Android.
   ============================================================ */

function pickJSONFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.display = "none";
    input.onchange = () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) { resolve({ canceled: true }); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ canceled: false, text: reader.result, name: file.name });
      reader.onerror = () => resolve({ canceled: false, error: "Could not read that file." });
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
  });
}

function parseBackupText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "That file isn't valid JSON — it doesn't look like a TopList BizLedger backup." };
  }
  const raw = parsed.toplist_db;
  if (!raw) {
    return { error: "That file doesn't contain recognizable TopList BizLedger data." };
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "That backup's data is corrupted and can't be read." };
  }
  return { data };
}

export function installMobileNativeBridge() {
  window.toplistNative = {
    async exportBackup() {
      const store = await readStoreFile();
      const fileName = `toplist-bizledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const json = JSON.stringify(store);
      await Filesystem.writeFile({ path: fileName, directory: Directory.Cache, data: json, encoding: Encoding.UTF8 });
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
      await Share.share({
        title: "TopList BizLedger Backup",
        text: "TopList BizLedger data backup — merge this into another device from Settings.",
        url: uri,
        dialogTitle: "Save or send your backup",
      });
      return { canceled: false, filePath: fileName };
    },

    async pickMergeFile() {
      const picked = await pickJSONFile();
      if (picked.canceled) return { canceled: true };
      if (picked.error) return { canceled: false, error: picked.error };
      const { data, error } = parseBackupText(picked.text);
      if (error) return { canceled: false, error };
      return { canceled: false, data, sourcePath: picked.name };
    },

    async importBackup() {
      const picked = await pickJSONFile();
      if (picked.canceled) return { canceled: true };
      if (picked.error) return { canceled: false, error: picked.error };
      let parsed;
      try {
        parsed = JSON.parse(picked.text);
      } catch {
        return { canceled: false, error: "That file isn't valid JSON — it doesn't look like a TopList BizLedger backup." };
      }
      if (typeof parsed !== "object" || parsed === null || !("toplist_db" in parsed)) {
        return { canceled: false, error: "That file doesn't contain recognizable TopList BizLedger data." };
      }
      try {
        const current = await Filesystem.readFile({ path: STORE_FILE, directory: Directory.Data, encoding: Encoding.UTF8 });
        await Filesystem.writeFile({ path: `${STORE_FILE}.before-import-${Date.now()}.bak`, directory: Directory.Data, data: current.data, encoding: Encoding.UTF8 });
      } catch { /* nothing to back up on a brand new install */ }
      await Filesystem.writeFile({ path: STORE_FILE, directory: Directory.Data, data: picked.text, encoding: Encoding.UTF8 });
      return { canceled: false, restoredFrom: picked.name };
    },

    async sharePDF(base64Data, fileName) {
      await Filesystem.writeFile({ path: fileName, directory: Directory.Cache, data: base64Data });
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
      await Share.share({
        title: fileName,
        text: `${fileName.replace(/\.pdf$/i, "")} — from TopList BizLedger`,
        url: uri,
        dialogTitle: "Share this document",
      });
      return { canceled: false, filePath: fileName };
    },

    platform: "android",
  };
}
