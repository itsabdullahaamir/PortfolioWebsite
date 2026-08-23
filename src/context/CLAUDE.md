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
| `SettingsContext.jsx` | ✅ | `useSettings()` exposes `motion`, `sound`, `typewriter` (defaults: `true, true, true`) plus `toggle(key)`. Persists to `localStorage['tt_resume_settings']`. `motion` is consumed by `AmbientLayer.jsx`, `RevealPanel.jsx`, `ToastProvider.jsx`, `TitleScreen.jsx`, `EpisodeView.jsx`, `TitleBackdrop.jsx` and `Typewriter.jsx`; `typewriter` is consumed by `Typewriter.jsx` (built this batch — before it existed the toggle flipped a value nothing read, and users reported it as broken). **`sound` is now consumed by `../lib/sound.js`'s `useSound()` hook**, which gates the synthesized `navigate`/`select`/`toast` UI cues, and its control is back in `MainMenu.jsx`'s OPTIONS group. **This batch: `sound` now defaults `true`**, per direct user request ("the sound of the website should be on, always when a new user comes... they can turn it off if they want") — a deliberate override of spec mechanic 5's default-off language, which describes a background ambient soundscape (cut, never built) rather than these short interaction cues. This does not reintroduce actual autoplay: `AudioContext` creation still requires a genuine browser user gesture regardless of this flag, and `StartPrompt.jsx` (Beat 0) already guarantees that gesture happens before beat 1 even renders — defaulting `sound: true` just means the cues are already armed once that first click lands, instead of requiring a second explicit opt-in click in OPTIONS. |

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
