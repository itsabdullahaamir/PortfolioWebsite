# src/assets/ — fonts, cover images, title art

Parent: [`../CLAUDE.md`](../CLAUDE.md) → [`/CLAUDE.md`](../../CLAUDE.md).
Any change in this folder updates this file and the root repo map in the
same change.

**Status: `fonts/` is done (✅). `audio/` now holds 14 real tracks (✅,
new this batch). `covers/` and `title-art/` are still empty (⬜).**

## Subfolders

| Folder | Status | What belongs here |
|---|---|---|
| `audio/` | ✅ populated this batch — not in spec §7's original file list | Lofi background tracks for `../components/BackgroundMusic.jsx` (the main-menu "radio," direct user request — see `../components/CLAUDE.md` and `../lib/CLAUDE.md`). **Holds 14 MP3s as of this batch**: `01-sweet-september.mp3` and `02-sleepy-cat.mp3`, fetched directly from Mixkit's public CDN by this assistant with the user's explicit in-chat permission (Mixkit License, free/no attribution — "Sweet September" by Arulo, "Sleepy Cat" by Alejandro Magaña); the remaining twelve (`Artist - Title.mp3`-named files — AERØHEAD, Artificial.Music ×3, Barradeen, Dj Quads, Lakey Inspired, Purrple Cat, Supapao ×2, The Loyalist, Tokyo Music Walker) were dropped in directly by the user while the above work was in progress, and `../lib/musicPlaylist.js` picked them up automatically with no code change needed — the auto-discovery design proved itself mid-session. Two supported filename conventions, both auto-parsed (see `../lib/CLAUDE.md`): `NN-title.mp3` (numeric order prefix, needs a `TRACK_META` entry in `musicPlaylist.js` for artist credit) or `Artist - Title.mp3` (artist auto-extracted from the filename, no code change needed — this is how most royalty-free sites already name their downloads, so files sourced elsewhere and dropped in as-is just work). **License responsibility for files added directly to this folder sits with whoever adds them** — this codebase has no way to verify a dropped-in file's actual terms; only use royalty-free/properly-licensed sources ([Pixabay Music](https://pixabay.com/music/), [Mixkit](https://mixkit.co/free-stock-music/), etc.), never anything ripped/downloaded from YouTube or another copyrighted source — that request was explicitly declined for this assistant's own sourcing, for both copyright and ToS reasons. Keep individual files reasonably small where possible (some of the user-added files run several MB each) — spec §7's "load fast" floor is about the critical path (JS bundle, fonts, first paint), which this doesn't block since `BackgroundMusic.jsx` only mounts once the menu (Beat 3) is reached, well after initial load and each track is a separate lazy-loaded static asset, not bundled into the JS. |
| `fonts/` | ✅ | Two real Latin-subset WOFF2 files, self-hosted, finishing Phase 1: `alfa-slab-one-latin-400.woff2` (19KB — the display face, Alfa Slab One per spec §3.2's first option, single static weight 400, titles/episode-title-cards/chapter-numbers only, never body copy) and `inter-latin-var.woff2` (48KB — the body face, Inter per spec §3.2's first option, a single variable-weight file covering 100–900 rather than one static file per weight). Wired up via `@font-face` in `../styles/tokens.css` (`font-display: swap` on both, `font-weight: 100 900` on Inter) and preloaded in `/index.html` via `<link rel="preload" as="font" type="font/woff2" crossorigin>` with relative `./src/assets/fonts/...` hrefs — verified against `dist/index.html` after a production build that the preload hashes match the hashes Vite gives the same files via the CSS `url()` references (both resolve to e.g. `/assets/alfa-slab-one-latin-400-CbTZiZTW.woff2`), so the preload isn't preloading a different copy of the file than the one actually used. |
| `covers/` | ⬜ empty | 16:9 cover image per episode, referenced today as `/covers/ep1.webp` through `/covers/ep5.webp` in [`../data/episodes.js`](../data/CLAUDE.md) — those paths currently point at nothing. WebP, max 1200px wide, lazy-loaded below the fold (spec §7). Until real art exists, `ChapterSelect.jsx` (see [`../screens/CLAUDE.md`](../screens/CLAUDE.md), built and routed since Phase 4) falls back to a flat two-tone silhouette per spec §4.2, not a broken image — this note was stale (said "not yet built") and is corrected here. |
| `title-art/` | ⬜ empty | The single full-bleed painted environment scene used in the opening sequence (spec §4.1 Beat 2) and reused as the `MainMenu.jsx` backdrop. Per spec: "the one place in the whole site worth commissioning or carefully AI-generating real art for." Not a photo, not a gradient — ink-and-watercolor style matching the panel treatment in §3.3. This is a content/production decision (real commission vs. AI-generated vs. typography-only per spec §10 open questions), not a coding one — flag it for the user, not for an implementation model, when Phase 3/10 comes up. |

## Resolved cleanup item

`src/App.jsx` used to import `./assets/react.svg`, `./assets/vite.svg`,
and `./assets/hero.png` — leftovers from the default `create-vite`
template, none of which ever existed in this folder. `App.jsx` was
rewritten as the router root (root `CLAUDE.md` §5 Phase 4); those imports
were deleted along with the rest of the template markup, not recreated.
`fonts/` is now referenced (via `../styles/tokens.css`'s `@font-face`
rules) — see the table above. `covers/` and `title-art/` are still not:
`TitleReveal.jsx` and `MainMenu.jsx` (see
[`../components/CLAUDE.md`](../components/CLAUDE.md)) use a flat
gradient placeholder backdrop instead of an image from `title-art/`, and
`ChapterSelect.jsx` (see [`../screens/CLAUDE.md`](../screens/CLAUDE.md))
renders a CSS-gradient silhouette instead of images from `covers/`. Both
are structured so dropping a real asset into this folder and pointing
one constant/import at it is a one-line swap — no component rewrite
needed.

## Rules

- Nothing in this folder is referenced by raw `<img src>` with a
  hardcoded path inside a component beyond what `episodes.js` already
  provides for `cover` — new asset references belong in `data/` if
  they're per-episode content, or as a prop/import if they're structural
  (like the single title-art image).
- Do not add a video file here — spec §2 rule 4 explicitly bans video
  backgrounds.
