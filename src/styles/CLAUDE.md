# src/styles/ — design tokens and texture CSS

Parent: [`../CLAUDE.md`](../CLAUDE.md) → [`/CLAUDE.md`](../../CLAUDE.md).
Any change in this folder updates this file and the root repo map (and
the Design Tokens table in the root file, if a token value changes) in
the same change.

## Files

| File | Status | Notes |
|---|---|---|
| `tokens.css` | ✅ | Single source of truth for the spec §3.1 palette (`--ink`, `--paper`, `--shadow`, `--signal`, `--dusk`, `--bone`), the §3.2 font stacks (`--font-display`, `--font-body`), and the §3.2 type scale (`--text-xs` through `--text-3xl`). Imported by `../index.css`, which maps every one of these into Tailwind's `@theme` so components use `bg-ink` / `text-signal` / `font-display` utilities instead of raw hex or arbitrary values. **Phase 1 fonts now done:** this file also carries the `@font-face` declarations for the two self-hosted files in `../assets/fonts/` (see `../assets/CLAUDE.md`) — `font-display: swap` on both, `font-weight: 100 900` on Inter since it's a single variable-weight file. Kept here rather than in `index.css` because this is already the single source of truth for the font *stacks* the faces belong to — one place for all of typography, not two. |
| `textures.css` | ✅ | Inline SVG data-URI textures only, per the performance floor (spec §7: "textures as inline SVG data URIs, not image files"). `.texture-halftone` (4–8% opacity dot pattern, used by `Panel.jsx`) and `.texture-grain` (3% opacity fractal-noise overlay). **Phase 9:** `.texture-grain` is now in use — one of the two mechanic-5 ambient details chosen (the other is panel parallax, see below). Also added: `@keyframes grain-shift` + `.texture-grain-animate`, an 8-step-per-second `steps()` animation shifting `background-position` for the ~8fps flicker spec §5 calls for. Mounted as a fixed full-viewport overlay by `../components/AmbientLayer.jsx`, which also decides whether it renders at all (not rendered under reduced motion, not just frozen). **This batch:** `.texture-halftone-light` — the same dot geometry and repeat as `.texture-halftone` but drawn in `--bone` instead of `--ink`, at 8% rather than 6% (a light dot on a dark ground carries less perceived contrast than the reverse at equal alpha). Used by `Panel.jsx`’s new `tone="night"` surface on `../screens/ChapterSelect.jsx`, where the ink version is invisible and therefore pure opacity cost. Still an inline SVG data URI, no image file, same as everything else in this file. |
| `motion.css` | ✅ | Keyframes for `../components/TitleBackdrop.jsx`'s scene: `solo-glow` (the easter-egg window's slow breath), `ember-rise` (click-spawned particles), `fog-drift` (drifting fog bands), `window-flicker` (ordinary lit windows). **New this batch:** `prompt-blink`, for `../components/StartPrompt.jsx`'s "PRESS START"-style gate — a hard `steps(1)` on/off cut rather than an eased fade, deliberately, since that's the specific old-arcade reference being chased (this site's other transitions are all soft/eased; this one isn't, on purpose). `solo-glow` is deliberately a *breath* rather than `window-flicker`: the other windows are stairwells and corridors, that one is a person still working, and it is also the only cue the pane is interactive — so unlike flicker it must never fall to fully dark. Three keyframes were **removed** rather than left around unused — `figure-walk`, `figure-sway` and `shooting-star`, all belonging to title-screen elements that were cut (see `../components/CLAUDE.md` for why). Kept separate from `tokens.css` (palette/type, not animation) and `textures.css` (static data-URI patterns, not keyframes) — one file per concern. `TitleBackdrop.jsx` is responsible for gating all of these behind reduced motion itself (component-level checks, not a CSS media query here), since several of them shouldn't render at all under reduced motion rather than just freeze. **This batch:** `eq-bar`, a simple `scaleY` pulse for the three-bar equalizer glyph on `../components/BackgroundMusic.jsx`'s "Currently Playing" badge (main-menu lofi playlist, direct user request — see below and that file), staggered per-bar via inline `animation-delay`. Same reduced-motion pattern as everything else here: gated off by the component itself, not a media query in this file. |

## Rules for anyone touching this folder

- Never add a hex color or a font-family string anywhere outside
  `tokens.css`. If a component needs a new color, that is a design-token
  decision — flag it for Opus (root `CLAUDE.md` §2 model policy) rather
  than picking a value inline.
- `--signal` must stay a scarce accent per spec §3.1 ("appears at most
  three times per screen... if it is everywhere, it stops reading as a
  choice"). This is a usage discipline enforced in component code, not
  something `tokens.css` itself can prevent — call it out in review.
- If a new texture is added, keep it as an inline SVG data URI in this
  file's pattern, not an image asset (see the performance floor above,
  and [`../assets/CLAUDE.md`](../assets/CLAUDE.md) for why image assets
  are reserved for covers/fonts/title-art only).
- Mechanic 5 (spec §5) says pick two ambient details, not all four. The
  two chosen: film grain (this file, `.texture-grain-animate`) and a
  slow panel-background parallax (implemented in
  [`../components/RevealPanel.jsx`](../components/CLAUDE.md), not here,
  since it's scoped per-panel rather than global). Do not add mechanic
  5's specific "ambient soundscape" pick or the crosshair cursor — spec
  explicitly says pick two, and flags that soundscape as likely scope
  creep. **This no longer means "no audio at all beyond UI cues"** —
  `../components/BackgroundMusic.jsx` (main-menu lofi playlist) exists
  now as a separate, directly user-requested feature outside the
  mechanic-5 menu entirely, the same precedent as `PageTransition.jsx`/
  `StartPrompt.jsx` being added outside their own spec sections on
  direct request. The distinction that still matters: don't unilaterally
  add ambient audio as an implementation-level interpretation of
  mechanic 5's four options — that stays cut.
- `../index.css` (documented in [`../CLAUDE.md`](../CLAUDE.md)) now also
  carries a `.motion-off` class-scoped mirror of the
  `prefers-reduced-motion` media-query block below it, so plain-CSS
  transitions can honor the in-app Settings motion toggle too — see that
  file and `../components/AmbientLayer.jsx` for why a media query alone
  can't do this.
