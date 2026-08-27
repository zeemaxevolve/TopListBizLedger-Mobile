# TopList BizLedger — Android App

The same TopList BizLedger app used on desktop, wrapped for Android with
[Capacitor](https://capacitorjs.com). Business logic and document
templates are unchanged — `src/TopListERP.jsx` is a copy of the desktop
app's source file, including the embedded company signature and stamp.

**Works fully offline**, exactly like the desktop version. To move data
between phone and desktop, use **Settings → Export Backup** on one
device and **Settings → Merge Backup…** on the other.

## Getting the real .apk file

Same as the other mobile builds in this project family — I can't
compile the actual `.apk` in this sandbox (no access to Google's Maven
repo or Gradle's servers). Two ways to get it:

### Option A — GitHub Actions (recommended)
1. Create a free GitHub repo, upload everything in this `mobile`
   folder into it.
2. Go to the **Actions** tab — the workflow runs automatically, or
   click **"Run workflow"**.
3. Wait ~3–5 minutes for the green checkmark.
4. Download `toplist-bizledger-debug-apk` from the Artifacts section,
   transfer to your phone, install (allow "install unknown apps"
   once, when prompted).

### Option B — Build locally with Android Studio
```bash
npm install
npm run build
npx cap sync android
npx cap open android
```
Then click ▶ Run in Android Studio.

## Notes on this build specifically
- The native bridge is named `toplistNative` (not `zeemaxNative`) — this
  matches TopList's own desktop app exactly. A previous sibling app in
  this family had its PDF sharing silently break because of a naming
  mismatch between its desktop and mobile bridges; this build was set
  up carefully from the start to avoid that.
- `src/storage-bridge.js` uses a single combined JSON file for all
  storage keys, so `native-bridge.js`'s backup export always sees the
  exact same data the app is reading and writing.
