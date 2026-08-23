# src/context/ — global state

Parent: [`../CLAUDE.md`](../CLAUDE.md) → [`/CLAUDE.md`](../../CLAUDE.md).
Any change in this folder updates this file and the root repo map in the
same change.

Both providers are done and match spec §7 ("React Context for progress +
settings. Persist to localStorage. No state library needed."). Neither
is currently mounted anywhere — `App.jsx` still needs to wrap the app in
both (see [`../CLAUDE.md`](../CLAUDE.md) Phase 4 note).

## Files

| File | Status | Notes |
|---|---|---|
| `ProgressContext.jsx` | ✅ | `useProgress()` exposes `visited`, `lastEpisodeId`, `visitEpisode(id)`, `isVisited(id)`, `confidence` (0–100, mechanic 3 math: 20% base + even split of the remaining 80% across `episodes.length`), `hasSave`, `allEpisodesVisited`. Persists to `localStorage['tt_resume_progress']` as `{ visited, lastEpisodeId }`. Drives: the CONTINUE menu item, `ConfidenceMeter.jsx` (not yet built), and the visited-episode corner mark on chapter select (not yet built). |
| `SettingsContext.jsx` | ✅ | `useSettings()` exposes `motion`, `sound`, `typewriter` (defaults: `true, false, true` — sound defaults off per spec's "never autoplay" rule) plus `toggle(key)`. Persists to `localStorage['tt_resume_settings']`. `motion` is consumed by `AmbientLayer.jsx`, `RevealPanel.jsx`, `ToastProvider.jsx`, `TitleScreen.jsx`, `EpisodeView.jsx`, `TitleBackdrop.jsx` and `Typewriter.jsx`; `typewriter` is consumed by `Typewriter.jsx` (built this batch — before it existed the toggle flipped a value nothing read, and users reported it as broken). **`sound` is now consumed by `../lib/sound.js`'s `useSound()` hook**, which gates the synthesized `navigate`/`select`/`toast` UI cues, and its control is back in `MainMenu.jsx`'s OPTIONS group. (An earlier pass removed the toggle when there was genuinely nothing behind it; that was the wrong call to leave in place once real audio existed, and the user asked for it directly.) It still defaults to `false` — spec's "never autoplay" rule — and the first click on the toggle is also the browser's required user gesture to start the underlying `AudioContext`, so nothing can play before that click regardless. |

## Rules for anyone extending these

- Both hooks throw if used outside their provider — keep that pattern for
  any new context added here rather than silently returning defaults.
- `localStorage` keys (`tt_resume_progress`, `tt_resume_settings`) are
  part of the spec's naming (§5 mechanic 3 names the progress key
  explicitly) — do not rename without updating both this file and the
  root `CLAUDE.md`.
- If a third context becomes necessary, add it here and update this
  table plus the root repo map — do not bolt extra state onto these two
  providers.
