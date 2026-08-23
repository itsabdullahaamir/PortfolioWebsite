# src/ — App shell

Parent: [`/CLAUDE.md`](../CLAUDE.md) — read that first for the model
policy and the mandatory update rule (any change here updates both this
file and the root file).

## Files in this folder

| File | Status | Notes |
|---|---|---|
| `main.jsx` | ✅ | Standard Vite/React bootstrap (`createRoot` + `StrictMode`). Imports `index.css` and `App.jsx`. No spec-driven changes expected here — do not add app logic to this file. |
| `App.jsx` | ✅ | The router root. `<BrowserRouter>` wrapping `ProgressProvider` → `SettingsProvider` → `ToastProvider` → `<Routes>` for `/` (`TitleScreen`), `/chapters` (`ChapterSelect`), `/chapters/:id` (`EpisodeView`), `/plain` (`PlainResume`), per spec §7 "Routing". The old default-`create-vite` template markup and its dead imports (`./assets/react.svg`, `./assets/vite.svg`, `./assets/hero.png`, `./App.css`, the `/icons.svg` sprite) were deleted, not recreated — none of those files exist and none are part of the spec. |
| `index.css` | ✅ | Imports Tailwind, `styles/tokens.css`, `styles/textures.css`; maps tokens into Tailwind's `@theme` so components can use `bg-ink`, `text-signal`, `font-display`, etc. instead of arbitrary values. Also carries the global focus-ring rule and the CSS-level `prefers-reduced-motion` fallback. **Phase 6:** now also carries a `.motion-off`-scoped mirror of that same reduced-motion block, toggled onto `<html>` by `components/AmbientLayer.jsx` whenever the Settings motion toggle is off — see that component and `styles/CLAUDE.md` for why a media query alone can't see in-app state. Otherwise treat as done; only touch if a new token is added to `tokens.css` and needs a matching `@theme` line. |

## Subfolders

- [`components/`](components/CLAUDE.md) — reusable UI primitives (Panel, DialogueChoice, toasts, etc.)
- [`context/`](context/CLAUDE.md) — React Context providers (progress, settings)
- [`data/`](data/CLAUDE.md) — single source of truth for all resume content (`episodes.js` = the curated game surface, organized by category — education, academia, leadership/volunteering, hackathons, projects — not chronology; `profile.js` = everything else the `/plain` document needs)
- [`lib/`](lib/CLAUDE.md) — non-visual utilities (currently just `sound.js`, the synthesized UI sound engine)
- [`screens/`](screens/CLAUDE.md) — route-level screens (all 4 built, routing wired)
- [`styles/`](styles/CLAUDE.md) — design tokens and texture CSS
- [`assets/`](assets/CLAUDE.md) — fonts, cover images, title art (all empty)

## Rule reminder

`data/` is the only place content may live — `data/episodes.js` for the
five-episode game surface, `data/profile.js` for the contact/education/
skills/awards material that only the `/plain` document renders. No file
directly under `src/` (i.e. `App.jsx`) may hardcode resume copy — it
composes screens/components that read from `data/`.
