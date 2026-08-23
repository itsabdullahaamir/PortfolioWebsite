# Telltale-Style Interactive Resume — Master Guide

This is the root guidance file for the whole repo. It is the entry point:
read this first, then follow the link into whichever folder you're about
to touch for the folder-specific detail.

**Full spec of record:** [`docs/PortfolioSpec.md`](docs/PortfolioSpec.md)
(copied from the original brief). If anything in this file or a folder
`CLAUDE.md` ever seems to contradict the spec, the spec wins — fix the
`CLAUDE.md` to match it, don't silently follow the stale doc.

## 0. The one-line concept

A personal resume that behaves like a Telltale (Walking Dead) episode
booting up: presents card → painted title reveal → in-universe main menu
→ chapter select → episode view with comic panels. The game is the skin;
the resume is the substance. **Core constraint that overrides everything
else:** a recruiter must be able to get the actual information in under
90 seconds without playing along. See spec §1–2 for the full non-negotiable
rules (no forced interaction, no gating timers, always a plain-text escape
hatch, load fast, respect reduced motion, mobile is not an afterthought).

## 1. Mandatory update rule

**Whenever any code file in this repo changes — new file, edit, delete,
rename — two documents must be updated in the same change:**

1. This root `CLAUDE.md` (at minimum: the Repo Map status table in §4,
   and the Build Phase Status in §5 if the change advances/breaks a phase).
2. The `CLAUDE.md` inside the folder that file lives in (its file list,
   status, and any implementation notes).

Do not defer this to "later" or a separate commit. A `CLAUDE.md` that
describes a folder incorrectly is worse than no `CLAUDE.md` at all,
because it will be trusted. If you are the one making the change, you are
the one who updates both files before considering the task done.

## 2. Model policy — who does what

**Opus decides. Sonnet/Haiku code.** This is a hard rule, not a
suggestion, and it exists because time is the scarce resource here, not
model capability for most of this build.

- **Opus's job:** resolve ambiguity, make architecture/design-token
  judgment calls, decide which model handles the next unit of work,
  review/approve a phase as done, and write or update `CLAUDE.md` files
  itself when the decision-level context is what's being recorded. Opus
  does not hand-write component/screen implementation code except to fix
  a judgment-level defect that a lower model flagged as ambiguous.
- **Sonnet (default coding model):** all standard implementation —
  new components, screens, context wiring, routing, most of the work in
  the Build Phase list below. If you're not sure whether a task needs
  Opus or Sonnet, it's Sonnet.
- **Haiku:** mechanical, low-judgment work only — placeholder copy edits
  in `episodes.js`, repetitive near-identical edits across files, simple
  CSS value tweaks, filling in a `CLAUDE.md` status table after Sonnet
  finishes a phase.
- **Batch by phase, not by file.** Pick one model for an entire phase or
  logical unit of work (e.g. "build all of §5 mechanic 1") and stay on it
  until that unit is done. Do not switch models mid-task to save a few
  tokens on one file — the switching overhead costs more time than it
  saves. Switch only at phase boundaries, per Build Order in spec §8.

## 3. Design tokens (spec §3) — quick reference

Full detail and rationale: spec §3. Source of truth in code:
[`src/styles/tokens.css`](src/styles/CLAUDE.md).

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#141210` | Borders, outlines, text on light surfaces |
| `--paper` | `#D8CFC0` | Base background |
| `--shadow` | `#3B342E` | Panel fills, secondary surfaces |
| `--signal` | `#C4321E` | THE accent — max 3 uses per screen |
| `--dusk` | `#2A3742` | Cool counter-shadow, sparing |
| `--bone` | `#EFE7D8` | Text on dark panels |

Display face: Alfa Slab One / Oswald 700 / Archivo Black (titles only).
Body face: Inter / Source Sans 3 / Public Sans. Never hardcode a hex
value or font stack in a component — reference the token.

## 4. Repo map

Status legend: ✅ implemented and matches spec · 🚧 partially implemented
· ⬜ not started · ⚠️ stale/broken, needs cleanup.

```
/                             ✅ scaffold present
├── .github/
│   └── workflows/
│       └── deploy.yml        ✅ builds with `npm run build` and deploys
│                                `dist/` to GitHub Pages on every push to
│                                `main` (`actions/upload-pages-artifact` +
│                                `actions/deploy-pages`). Not part of the
│                                original 10-phase spec build — added so
│                                the live site has a stable link for
│                                outside testers. See §9 below.
├── docs/
│   ├── PortfolioSpec.md      ✅ spec of record, do not edit casually
│   └── content-draft.md      ⚠️ Phase 10 intake form — now SUPERSEDED. The
│                                user supplied a full master resume instead
│                                and the copy questions are answered; only
│                                its §3 (art) and §4 (stats numbers) are
│                                still open. Delete once those two land.
├── public/                   🚧 see public/CLAUDE.md
├── src/                      🚧 see src/CLAUDE.md
│   ├── main.jsx              ✅ standard Vite bootstrap, unlikely to need changes
│   ├── App.jsx                ✅ router root — BrowserRouter wrapping
│   │                            ProgressProvider → SettingsProvider →
│   │                            ToastProvider → AmbientLayer + Routes for
│   │                            /, /chapters, /chapters/:id, /plain (spec
│   │                            §7). Default Vite template markup and dead
│   │                            asset imports removed, not recreated.
│   ├── index.css              ✅ Tailwind v4 theme mapped to tokens.css,
│   │                            plus a class-scoped reduced-motion mirror
│   ├── components/           🚧 see src/components/CLAUDE.md — 11 of the
│   │                            original spec §7 14 built, plus
│   │                            StartPrompt.jsx (new this batch, not in
│   │                            spec — a beat-0 "click to start" gate).
│   │                            TitleBackdrop.jsx is a four-plane city scene
│   │                            (~69% frame height, glowing window grids,
│   │                            parallax, embers, lone-lit-window easter
│   │                            egg; no human figure) — Phase 3 below
│   ├── context/               ✅ see src/context/CLAUDE.md — both providers done
│   ├── data/                  ✅ see src/data/CLAUDE.md — content source of
│   │                            truth. episodes.js carries REAL content
│   │                            (Phase 10) organized by CATEGORY, not
│   │                            chronology — education / academia (TA+RA)
│   │                            / leadership+volunteering / hackathons /
│   │                            projects; profile.js carries the
│   │                            contact/education/skills/awards material
│   │                            that only /plain renders
│   ├── lib/                    ✅ see src/lib/CLAUDE.md — new this batch.
│   │                             sound.js: Web Audio-synthesized UI cues
│   │                             (navigate/select/toast), no shipped files
│   ├── screens/               ✅ see src/screens/CLAUDE.md — all 4 screens built,
│   │                            routing wired end to end, motion pass done.
│   │                            PlainResume.jsx rebuilt this batch into a
│   │                            complete resume document (contact, education,
│   │                            experience, skills, awards, volunteering).
│   │                            ChapterSelect.jsx rebuilt this batch from a
│   │                            plain grid into a hero-panel + filmstrip
│   │                            layout, matching a live Telltale episode-
│   │                            select screenshot the user supplied
│   ├── styles/                ✅ see src/styles/CLAUDE.md — tokens + textures,
│   │                            fonts wired, grain texture in use, plus new
│   │                            motion.css (title-screen scene keyframes)
│   └── assets/                🚧 see src/assets/CLAUDE.md — fonts/ done (two
│                                  real WOFF2 files, self-hosted); covers/ and
│                                  title-art/ still empty, screens use
│                                  placeholder fallbacks (silhouette covers,
│                                  TitleBackdrop.jsx layered-silhouette scene)
└── CLAUDE.md                  (this file)
```

## 5. Build phase status (spec §8)

Ten phases, must proceed in order — each independently viewable per spec.

| # | Phase | Status |
|---|---|---|
| 1 | Scaffold (Vite+React+Tailwind+Router, tokens, fonts) | ✅ Vite/Tailwind/tokens/Router all done. Fonts are now self-hosted (see `src/assets/CLAUDE.md`): two real Latin-subset WOFF2 files wired via `@font-face` in `tokens.css` and preloaded in `index.html` — verified the preload hashes match the CSS `url()` hashes in a production build. Phase 1 is complete. |
| 2 | The Panel primitive | ✅ `src/components/Panel.jsx` — irregular clip-path, hard shadow, halftone texture, hover lift, all per spec §3.3. Unmodified this batch (motion wraps around it, per `RevealPanel.jsx`, never inside it). |
| 3 | Opening sequence (3 beats) | ✅ Beat 1 (`PresentsCard.jsx`), Beat 2 (`TitleReveal.jsx`), Beat 3 (`MainMenu.jsx`) all built and sequenced by `src/screens/TitleScreen.jsx`. Skippable at every beat by click/tap/key. Deliberately still plain CSS transitions for the beat swap itself, not `AnimatePresence` — see `src/screens/TitleScreen.jsx`'s doc comment: spec 4.1 calls for a hard cut between beats 1 and 2, and an `AnimatePresence` cross-fade there would flash the page's `--paper` background between beats. **Fixed earlier this batch:** beats 2 and 3 were reading as visually empty (a flat two-tone gradient), which spec 4.1 explicitly rules out. `TitleReveal.jsx`'s name text also picked up the spec 3.4 distressed-edge filter (SVG `feTurbulence`+`feDisplacementMap`) and a restrained ink-splatter accent, previously deferred. **Then rebuilt twice more this batch** on user feedback. Round 2 replaced the tessellated polygon zigzag ("basic blocks... easily seen through") with hand-placed buildings and added the interactive set: mouse-parallax, a figure, click-spawned embers (beat 3 only — beat 2's whole screen is a click-to-skip button, so embers are gated off there via an `interactive` prop rather than risk a handler competing with the skip), and a hidden one-time easter egg (3 window clicks → a shooting star). Round 3 fixed what a live screenshot then exposed: the skyline filled only ~20% of the frame leaving a huge dead gradient above it, the "lit windows" were flat pale rects with no halo (so they read as gray squares, not light), and the buildings were still plain merged blocks. `src/components/TitleBackdrop.jsx` is now **four parallax depth planes** (hills → far → mid → near, lighter-to-darker toward camera with a distance-haze band between far and mid), skyline peaking at **~69% of viewport height** per the requested 70/30 ratio, buildings carrying setbacks/water tanks/antennas/peaked roofs with deliberate overlap, and per-building **window grids** where each lit pane is drawn twice — blurred halo + crisp core — so it actually reads as a light source. Round 4 (this batch) cut the human figure entirely and fixed two real bugs. **The figure is gone** — the walking version read as an amateur GIF, and its rooftop replacement was a ~30px smudge nobody could find, so its interactivity may as well not have existed. In its place, and replacing the undiscoverable 3-click shooting-star egg, is **one easter egg that telegraphs itself**: a single near-layer building renders every window dark except one larger, slowly-breathing lit pane; clicking it reveals a silhouette still at a desk and fires a `lateNightWindow` memory toast (new copy pool in `src/data/toastVariants.js` — no inline strings). **Parallax bug fixed:** pointer tracking was on the backdrop's own div, but `MainMenu.jsx` stacks a full-height `<nav>` over it as a sibling, so the scene moved on beat 2 and was dead on beat 3; tracking (and the ember click listener) now live on `window`, with real controls excluded so menu clicks aren't fireworks. **The menu got content:** an identity block (name + headline, read from `profile.js`) and an orientation line naming EXTRAS as the plain resume — it was five bare verbs over a picture, which served the 90-second rule badly. `MainMenu.jsx` also gained a left-edge scrim, since menu text now sits over rooftops rather than empty sky. `src/styles/motion.css` holds the keyframes. Motion is gated off under reduced motion (OS or Settings), though the easter egg still works there since it's content, not decoration — all verified live. Real commissioned/painted art is still the eventual Phase 10 goal — `TITLE_ART_URL` is still the one-line swap point in both files. **Round 5 (this batch):** the intro was replaying every time `/` was reached from inside the app (e.g. the "← Title" link on `ChapterSelect.jsx`), not just on a fresh load. `TitleScreen.jsx` now gates the 3-beat sequence behind a module-level `hasPlayedIntro` flag that flips true the first time beat 3 (`MainMenu`) is reached; any later in-session mount of `/` opens straight on the menu, while an actual page reload still plays the full intro. See `src/screens/CLAUDE.md`. **Round 6 (this batch):** fixed a live-reported bug — a big `--signal` red box sometimes appearing around NEW GAME on load, no interaction needed. Cause was `MainMenu.jsx` imperatively calling `.focus()` on the first item on mount to seed keyboard roving-focus; browsers' `:focus-visible` heuristic treats a page's very first focus as keyboard-worthy even when script-driven, so the focus ring rendered for mouse users too, inconsistently across browsers (the "sometimes"). That `useEffect` is removed — nothing is focused imperatively on mount now. Keyboard reachability is unaffected (Tab reaches NEW GAME via native tab order, which legitimately triggers `:focus-visible`; arrows take over from there), and the `▸` selection highlight still shows on NEW GAME by default since that's driven by React state, not DOM focus. See `src/components/CLAUDE.md`. **Round 7 (this batch) — a new Beat 0 added, not in the original 3-beat spec:** `src/components/StartPrompt.jsx`, an explicit "click to start" gate (old-school arcade styled: full `--ink` screen, one blinking `--bone` line, "Click, tap, or press any key" hint) shown before `PresentsCard`. This exists to finally close out the sound-on-load saga from Phase 7/mechanic 1's status row below — repeated attempts to catch an *incidental* click early enough in beats 1–2 kept falling short ("I can't hear any sound... UNTIL I click on the website which is poor"), because a browser will not play audio before a real gesture and there usually wasn't one that early. This screen asks for the click up front instead of hoping for one. It's a deliberate, narrow exception to spec §2 rule 1 ("no forced interaction") — justified because it serves that hard technical requirement rather than gating content, it's one click/tap/key, not a sequence of choices, and `/plain` remains a separate, ungated route reachable directly. Unlike beats 1–2, it does NOT auto-skip under reduced motion (reduced motion turns off its blink, not the gate). Verified live end-to-end: `navigator.userActivation.hasBeenActive` is `false` while it shows and flips `true` on a keypress, which (confirmed via a patched `createOscillator`) results in the signature sting's full 5-voice chord actually firing once beat 2 is reached. See `src/components/CLAUDE.md` and `src/screens/CLAUDE.md`. |
| 4 | Static screens (chapter select, one episode view, dummy data) | ✅ All four screens built: `ChapterSelect.jsx`, `EpisodeView.jsx` (all 5 episodes, not just one), `TitleScreen.jsx`, `PlainResume.jsx`. Dummy data from `episodes.js` throughout, no hardcoded resume copy. **`ChapterSelect.jsx` rebuilt this batch:** the user supplied a live screenshot of their own reference Telltale game's episode-select screen (a large "now showing" panel with synopsis + a Start button, and a filmstrip of episode tiles underneath) and asked for that exact structure. The plain 1/2/3-column responsive grid is gone, replaced by a hero `Panel` (currently-selected episode's title/subtitle/`choicePrompt`/visited-status plus a `--signal`-filled "▸ START EPISODE N" `Link`, the only control that navigates) sitting above a horizontally-scrolling filmstrip of `Panel`-as-`button` tiles that update the hero's `selectedId` on click without navigating — mirroring the reference's "browse, then start" two-step exactly. Defaults to `useProgress().lastEpisodeId` (resume-where-you-left-off) or episode 1. Still spec §4.2 compliant: nothing locked, visited `--signal` corner marks preserved, silhouette cover fallback preserved, fully keyboard-reachable (Tab order reaches every tile and the Start link, which updates its `href` live as selection changes), mobile collapses the hero to one column and the Start button to full width while the filmstrip stays a horizontal scroller at every breakpoint with no page-level horizontal overflow. Verified live in-browser (selection swap, navigation, mobile geometry) plus `npm run lint` and `npm run build`. See `src/screens/CLAUDE.md` for full detail. |
| 5 | The `/plain` route | ✅ `src/screens/PlainResume.jsx` — plain semantic document, no theme styling, "Download PDF" wired to `window.print()` since no static PDF asset exists yet. Linked from every other screen. |
| 6 | Motion pass (Framer Motion + `useReducedMotion`) | ✅ Done. `useReducedMotion()` replaced the inline `window.matchMedia` check in `TitleScreen.jsx` and `EpisodeView.jsx` (the two files that had it), combined with `useSettings().motion` throughout. `AnimatePresence` used for the "episode transitions" spec §7 names explicitly (`EpisodeView.jsx`'s title-card dismissal) and for the toast (`ToastProvider.jsx`). `RevealPanel.jsx` (new) gives every panel the "fade + 12px rise, staggered 60ms" scroll reveal from spec 3.5, used by both `EpisodeView.jsx` and `ChapterSelect.jsx`. `DialogueChoice.jsx`'s hover bar now genuinely slides in (`scale-x`) rather than only fading color. Reduced motion (OS or Settings) disables all of the above — verified content stays fully visible, never mid-animation, by never branching to a differently-shaped DOM tree between the two states (see `RevealPanel.jsx`'s doc comment for the specific bug this avoids). |
| 7 | Mechanics 1, 2, 6 (toast, dialogue choices, choice-stats) | 🚧 Mechanic 1 (toast queue) done: `ToastProvider.jsx` + `MemoryToast.jsx` + `toastVariants.js`, now with the spec 3.5 slide-in/fade motion, plus a new `lateNightWindow` pool for the title-screen easter egg. **Restyled again this batch on a live user screenshot of the actual Telltale in-game notification** — the previous flat "HUD caption" bar (two thin rules, centered caps) was itself already a departure from spec but still wasn't what the reference showed. `MemoryToast.jsx` is now a solid `--ink` banner with a hand-torn right edge (static `clip-path` polygon, not seeded per Panel.jsx), a warning-triangle icon, and left-aligned bold sentence-case `--bone` text; `ToastProvider.jsx` moved the toast from bottom-left to flush top-left and changed the enter/exit motion to drop in from above instead of sliding from the side. See `src/components/CLAUDE.md` for the full rationale. Mechanic 2 (`DialogueChoice.jsx`) done — and now actually renders its prompt, fed by the new `choicePrompt` field on every episode. **`Typewriter.jsx` built this batch** (spec 3.5): 22ms/char, skippable by click or Enter, instant under the typewriter/motion toggles or `prefers-reduced-motion`, full text always present for screen readers, untyped remainder held at `opacity-0` so nothing reflows. Scoped to the dialogue prompt only — never panel bodies, which would put a timer in front of resume content (§2 rule 2). **The OPTIONS "Sound" toggle is now real too** — `src/lib/sound.js` synthesizes short UI cues with the Web Audio API (no shipped audio files); menu/choice roving focus plays `navigate`, activating an item plays `select`, and every memory toast plays `toast`. This is separate from spec §5 mechanic 5's "ambient audio" (a background soundscape, one of four optional atmosphere picks, cut earlier as scope creep) — short interaction feedback is what the toggle was always meant to gate, and shipping a toggle with nothing behind it was the actual bug, not the toggle's existence. **This batch:** menu-item hover now also plays `navigate` (previously hover changed selection silently, keyboard-only tick was deliberate — the user asked for hover to make sound too, see `MainMenu.jsx`'s `hoverIndex` helper), and the `toast` cue was retuned darker/less energetic per direct user feedback — lower pitch, glides down instead of up, held slightly longer (`src/lib/sound.js`). **Also this batch:** a one-time synthesized "signature sting" (`sounds.intro`) plays on first landing on the main menu — the user's "Netflix ta-dum" request, adapted dark/moody (a three-note minor motif settling down rather than a bright fanfare) rather than shipping an audio file. Fired from `src/screens/TitleScreen.jsx`, gated by the existing `hasPlayedIntro` session flag so it plays once, not on every return to `/`. **Retuned louder immediately after** ("that sound is a bit TOO small... make it louder and proper") — gains roughly 2.5x, and the closing note is now a real three-layer chord (sub-bass root, glide-down root, quiet octave-up shimmer) instead of one thin sine tone, since layering rather than raw volume is what makes a synth hit read as "proper." **Then retimed on two more live notes** — "the sound doesn't play on reload" and "play it the moment the second loading screen comes and stop when the menu loads." `intro` now starts on beat 2 (`TitleReveal`) instead of beat 3, and is actively cut off via a new `stop()` function it returns (rather than only ever finishing on its own) the instant the beat moves on to `MainMenu`, whether that's `TitleReveal`'s hold timing out or the visitor skipping it. The "doesn't play on reload" report turned out to be correct browser autoplay-policy behavior, not a bug — beats 1–2 auto-advance with no interaction required, so a visitor who never clicks/taps/presses a key during them never produces the user gesture a browser requires before any `AudioContext` can play audio; skipping a beat (already supported) supplies that gesture. See `src/lib/CLAUDE.md` and `src/screens/CLAUDE.md` for the full mechanism. **Retuned louder a second time** ("EXTREMELY LOW... can't hear it at 100 percent volume without headphones") — roughly another 3x on top of the previous pass, with the simultaneous three-voice chord layer specifically budgeted (not just multiplied blindly) so the peaks sum to ~0.95 rather than clipping past Web Audio's 1.0 ceiling (`src/lib/sound.js`). **A real bug also surfaced under that same report** ("I still can't hear shit until I CLICK"): the beat-2 effect was setting the one-shot `hasPlayedIntro` flag and attempting playback unconditionally, even with zero gesture yet, so the attempt failed silently (correct autoplay behavior) but burned the only shot — a later click could never trigger it again. New `hasHadUserGesture()` export (wraps `navigator.userActivation`) lets `TitleScreen.jsx` check first and, if no gesture has happened yet, wait for the first real `pointerdown`/`keydown` before playing instead of firing blind. **The saga finally closed this batch:** a further live report ("I can't hear any sound... UNTIL I click on the website which is poor") made clear that catching an incidental click was never going to be reliable — there usually wasn't one early enough. Rather than another retiming attempt, this batch adds Phase 3's new Beat 0 (`StartPrompt.jsx`, see that phase row above) — an explicit "click to start" gate before anything else in the sequence, so the required gesture is guaranteed rather than hoped for. Verified live end-to-end this time: the gesture flag is confirmed `false` while the gate shows and `true` immediately after a keypress on it, and the signature sting's full 5-voice chord is confirmed to actually fire once beat 2 is subsequently reached. Mechanic 6 (`ChoiceStats.jsx`) not started. **This batch — two direct user reports, both fixed:** (1) the toast read as smaller than the top-left corner it occupied and wanted to sit further from the edge — `ToastProvider.jsx`'s wrapper moved from flush `left-0 top-0` to `left-4 top-4` (`left-8 top-6` at `sm:`) and both it and `MemoryToast.jsx` grew (max-width `sm`→`md`/`md`→`lg`, more padding, larger icon and text). (2) `sounds.intro` felt too short — lengthened from ~0.9s to ~1.5s by extending the held closing chord's duration/delay, not by adding notes, still comfortably inside `TitleReveal.jsx`'s 1.8s hold so it still finishes naturally when the beat isn't skipped. See `src/components/CLAUDE.md` and `src/lib/CLAUDE.md`. |
| 8 | Mechanics 3, 4 (confidence meter, branching moment) | 🚧 Data/logic for both exists (`ProgressContext.jsx` computes confidence; `episodes.js` `build` episode carries the `branch` object) but no UI component renders either yet — `ConfidenceMeter.jsx` not started. |
| 9 | Polish pass (2 of 4 ambient details, then remove one) | 🚧 Two ambient details chosen and built: film grain (`src/styles/textures.css` `.texture-grain-animate`, mounted by `src/components/AmbientLayer.jsx`) and slow panel-background parallax, max 8px (`src/components/RevealPanel.jsx`). Ambient audio and the crosshair cursor deliberately not built, per spec's "pick two." The "then remove one" step of this phase has not been done — that is a content/design judgment call, flagged for Opus, not made unilaterally here. |
| 10 | Content swap (real copy, real title art) | 🚧 **Copy is DONE, art is not.** Every episode title/subtitle, panel, choice label and the mechanic-4 branch carry real content from the user's master resume — no placeholder prose remains in `episodes.js`. Bodies verified inside spec §6's 30–60 word band and headers inside the 2–5 word band, so nothing reflows. **This batch: `episodes.js` reorganized from chronology to category** on direct user feedback that episodes read as "going through my life" rather than as a portfolio — now `education`, `academia` (TA/RA/research), `guild` (leadership & volunteering), `sidequests` (hackathons), `build` (projects), 17 panels total (up from 16, a direct consequence of the regroup, not a target). See `src/data/CLAUDE.md` for the full per-episode breakdown and the `PLAIN_SECTIONS`/`profile.js` follow-on change this required. `src/data/profile.js` carries everything real that did not earn a panel (contact, education, full experience, skills, awards, other projects, volunteering, certifications) and `/plain` was rebuilt around it. Still outstanding: real title art and 5 cover images (`src/assets/title-art/` and `src/assets/covers/` remain empty, placeholder fallbacks still in use), plus four facts deliberately left out because the master resume flags them as unverified — listed in `src/data/CLAUDE.md`. |

**Resolved blocker:** `src/App.jsx` is no longer the default Vite
template. It is now the router root (`<BrowserRouter>` → `ProgressProvider`
→ `SettingsProvider` → `ToastProvider` → `AmbientLayer` + `<Routes>`). The
dead imports (`./App.css`, `./assets/react.svg`, `./assets/vite.svg`,
`./assets/hero.png`, the `/icons.svg` sprite reference) were deleted, not
recreated — `npm run build` and `npm run lint` both pass.

## 6. Non-negotiable rules (spec §2) — do not trade these away for polish

1. No forced interaction — every choice is optional, content reachable by scroll/keyboard alone.
2. No timers that gate content.
3. A plain-text escape hatch always exists (`/plain` route + persistent PDF download).
   **Fixed this batch:** `/plain` used to render episode panels plus a name
   hardcoded in JSX — no email, no education, no skills anywhere in the data —
   so a recruiter who took the escape hatch could not actually act on it. It
   now builds a real resume from `src/data/profile.js`. The PDF button is
   still `window.print()`; no static PDF asset exists yet.
4. Load fast — under 2s to interactive on mid-range Android/4G. No video backgrounds, no multi-MB hero images.
5. `prefers-reduced-motion: reduce` disables all transitions/parallax/typewriter — content appears instantly. (Enforced two ways now: `src/index.css`'s global CSS-level media-query fallback, PLUS a `.motion-off`-scoped mirror of the same rule toggled by `src/components/AmbientLayer.jsx` whenever `useSettings().motion` is off, so the in-app toggle disables plain-CSS transitions too, not just the OS setting. Framer Motion components (`RevealPanel.jsx`, `ToastProvider.jsx`, `TitleScreen.jsx`, `EpisodeView.jsx`) each combine `useReducedMotion()` with `useSettings().motion` directly. `Typewriter.jsx` is now built and combines `useReducedMotion()` with both the `typewriter` and `motion` settings, short-circuiting to the complete string by initialising to full length rather than animating fast — so text is never caught mid-reveal.)
6. Mobile is not an afterthought — chapter grid → single column, choice buttons → full-width stacked.

## 7. Accessibility & performance floors (spec §7)

- All interactive elements are real `<button>`/`<a>`, never a div with a click handler.
- Visible focus ring: 2px `--signal` outline, 2px offset — never removed. (Done globally in `src/index.css`.)
- `--signal` on `--paper` must be contrast-checked before using it for text (may only pass at large sizes).
- `/plain` has semantic headings, no ARIA gymnastics, linked from every screen.
- Fonts: Latin-subset WOFF2, preloaded. **Done** — two real files in `src/assets/fonts/`, `@font-face` in `src/styles/tokens.css`, preloaded in `index.html`, verified against a production build that the preload and the CSS `url()` resolve to the same hashed asset. Cover images: WebP, ≤1200px wide, lazy loaded — still pending real art (Phase 10). Textures: inline SVG data URIs only (done in `src/styles/textures.css`). Total JS bundle target: under 200KB gzipped — currently **~135.2KB gzipped** (`npm run build` output, after the `ChapterSelect.jsx` rebuild); still comfortably under budget. The sound engine added ~0.5KB — Web Audio synthesis rather than shipped audio files, per the performance floor.

## 8. Prompt template for handing off a build phase

Per spec §9, when assigning a phase to Sonnet/Haiku:

> Build phase [N] from `docs/PortfolioSpec.md`. Follow the design tokens
> in §3 exactly — no substituted colors or typefaces. All content must
> come from `src/data/episodes.js`; no component may hardcode copy.
> Respect every rule in §2. Before writing code, restate which files you
> will create or modify and why. After building, update this root
> `CLAUDE.md` and the affected folder `CLAUDE.md`(s) per §1 above, and
> list anything in the spec you could not implement and why.

## 9. Deployment (not in the original spec)

The repo is pushed to GitHub (`itsabdullahaamir/PortfolioWebsite`, public)
and served live via GitHub Pages at
**https://itsabdullahaamir.github.io/PortfolioWebsite/**, rebuilt
automatically by `.github/workflows/deploy.yml` on every push to `main`.
This exists purely to give outside testers a stable link — it is
infrastructure, not a spec phase, and doesn't affect the Build Phase
Status table in §5.

Three things had to change to make a client-routed (`BrowserRouter`) SPA
work on GitHub Pages, which serves static files with no server-side
rewrites:

1. `vite.config.js` sets `base: '/PortfolioWebsite/'` — required because
   Pages serves a project site (no custom domain configured) from a
   `/<repo-name>/` subpath, not the domain root.
2. `index.html`'s favicon link had to switch from a raw `/favicon.svg` to
   `%BASE_URL%favicon.svg` — Vite only rewrites bundled asset references
   for the new `base`, not literal absolute paths to `public/`.
3. `public/404.html` (new) plus a matching inline decode script in
   `index.html`'s `<head>` implement the standard
   [rafgraph/spa-github-pages](https://github.com/rafgraph/spa-github-pages)
   redirect trick, so a direct load or refresh of `/chapters`, `/plain`,
   etc. resolves instead of 404ing. See `public/CLAUDE.md` for the
   mechanism detail.

If a custom domain is ever added, `base` should revert to `/` and the
404 trick can be removed if the host does its own SPA fallback — flagged
here so a future change doesn't leave stale subpath config behind.
