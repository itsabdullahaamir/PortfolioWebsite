# Interactive Resume: Telltale-Style Portfolio

**Build spec + design brief.** This document is written so that a human can understand the project end to end, and so an AI coding agent can build it without further clarification. All content in here is placeholder unless marked `[REAL]`. Placeholder copy is intentionally written in the correct tone and length so it can be swapped 1:1 later without breaking layout.

---

## 1. The one-line concept

A personal resume that behaves like a real Telltale episode booting up. The **opening sequence and main menu specifically recreate The Walking Dead's real UI language**: the black "presents" card, the painted comic-cover title reveal, the minimal vertical menu over a moody environment scene. Once you're past the menu and inside an episode, the visual language loosens into its own thing (the comic-panel system in section 3.3), still unmistakably Telltale, but not a copy of any one title.

**Why anchor to Walking Dead specifically:** it's the game that defined the whole studio's visual identity, ink-and-watercolor art direction matching comic artist Charlie Adlard's style, restrained UI, environment doing the storytelling instead of chrome and buttons. Copying its *menu grammar* (structure, pacing, typography logic) gives the build something concrete to aim for instead of "Telltale-ish."

**Core constraint that overrides everything else:** a recruiter must be able to get the actual information in under 90 seconds without playing along. The game is the skin. The resume is the substance. Any mechanic that blocks, delays, or hides information gets cut.

---

## 2. Non-negotiable rules for whoever builds this

1. **No forced interaction.** Every "choice" is optional flavor. Content is reachable by scrolling and by keyboard alone.
2. **No timers that gate content.** QTE-style timing bars are allowed only as decoration on non-essential actions, and must always resolve successfully if ignored.
3. **A plain-text escape hatch always exists.** A persistent "Download PDF resume" control, and a `/plain` route that renders the same content as an unstyled, ATS-readable document.
4. **Load fast.** Target under 2s to interactive on a mid-range Android over 4G. No video backgrounds. No 5MB hero images.
5. **Reduced motion is respected.** `prefers-reduced-motion: reduce` disables all transitions, parallax, and the typewriter effect. Content appears instantly.
6. **Mobile is not an afterthought.** The chapter-select grid reflows to a single column. Choice buttons become full-width stacked rows.

---

## 3. Design tokens

### 3.1 Palette

The Telltale look is not "dark mode with an accent." It is a **hand-painted comic panel**: warm dirty neutrals, heavy black ink lines, and one saturated color that only appears where the story wants your eye.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#141210` | Panel borders, outlines, primary text on light surfaces |
| `--paper` | `#D8CFC0` | Base background, aged newsprint tone |
| `--shadow` | `#3B342E` | Panel fills, cross-hatch shading, secondary surfaces |
| `--signal` | `#C4321E` | THE accent. Choices, active states, the toast. Nothing else. |
| `--dusk` | `#2A3742` | Cool counter-shadow for depth, used sparingly in gradients |
| `--bone` | `#EFE7D8` | Text on dark panels, highlight edges |

**Rule:** `--signal` appears at most three times per screen. If it is everywhere, it stops reading as a choice and starts reading as a theme.

### 3.2 Typography

Two faces, both self-hosted as WOFF2 with `font-display: swap`.

- **Display / titles:** a heavy condensed grotesque with rough edges. Reference: the Telltale wordmark treatment. Free options: **Alfa Slab One**, **Oswald** (700), or **Archivo Black**. Used for episode titles, the name on the title card, and the chapter numbers only.
- **Body / dialogue:** a humanist sans that stays readable at small sizes. **Inter**, **Source Sans 3**, or **Public Sans**. All resume content lives here.

Type scale (rem, 16px base): `0.75 / 0.875 / 1 / 1.25 / 1.75 / 2.5 / 4`

Dialogue text gets a subtle text-shadow of 1px 1px 0 `--ink` at 40% opacity to mimic in-game subtitle legibility. Do not overdo it.

### 3.3 The comic panel treatment

This is the visual signature. Every content block is a **panel**:

- 3px `--ink` border, but not a perfect rectangle. Apply a slight `clip-path` polygon so corners are irregular by 2 to 6px. Vary it per panel so no two are identical.
- A hard offset drop shadow, no blur: `box-shadow: 6px 6px 0 var(--ink)`
- Inside, a very low-opacity halftone dot or cross-hatch texture as a repeating SVG background. Keep it at 4 to 8% opacity. It should be felt, not seen.
- On hover, the panel lifts 2px and the shadow grows to 8px. 120ms ease-out. That is the whole interaction.

### 3.4 The title treatment (comic-cover lettering)

Reserved for exactly two places: the opening title card and episode title cards. Not used anywhere else, or it loses its weight.

- Base display face (from 3.2) rendered heavier than body use, then distressed: a subtle jagged/torn edge on the letterforms via an SVG turbulence filter or a pre-cut distressed font variant, not a plain clean weight.
- A thin ink-splatter or drip texture bleeding from the bottom of a few letters, low-key, this is a signature move for the genre's title cards but should be restrained to a corner or an edge, not smeared across the whole word.
- Title sits directly over the painted environment art with no card or box behind it, just enough of a dark gradient under the text for contrast.
- Color is `--bone` or off-white, never `--signal`. Save red for UI, not the logotype.

### 3.5 Motion

| Moment | Behavior | Duration |
|---|---|---|
| Opening sequence | "Presents" card fades in/out, cut to painted title art, name resolves, menu fades in over the art | ~3.5 to 4s total, skippable |
| Chapter open | Cross-fade to black, then episode title card, then content | 600ms total |
| Panel reveal on scroll | Fade + 12px rise, staggered 60ms per panel | 300ms each |
| Choice hover | Text shifts right 4px, `--signal` left-edge bar slides in | 120ms |
| Toast appear | Slides in from bottom-left, holds 3.2s, fades out | 250ms in |
| Dialogue typewriter | 22ms per character, skippable by click or Enter | variable |

---

## 4. Screen-by-screen structure

### 4.1 Opening sequence and title screen (`/`)

This is a **three-beat sequence**, not a single static screen, matching how a real Telltale title actually opens. Total time to interactive menu: under 4 seconds, and skippable at every beat by any click, tap, or key press.

**Beat 1: The presents card.** Full black screen. Small, plain, centered text fades in:

```
                    ABDULLAH AAMIR PRESENTS



                (nothing else on screen)
```

No logo yet, no music sting required. Hold 1.2s, fade out 400ms. This is a direct beat-for-beat match of the "TELLTALE GAMES presents" card that opens every episode. It sets the frame before anything else does.

**Beat 2: The title reveal.** Cut to a full-bleed painted background, a single illustrated environment scene rendered in the ink-and-watercolor style from section 3.3, not a photo, not a gradient. This is the one place in the whole site worth commissioning or carefully AI-generating real art for, because it is doing the same job the Lee/Clementine key art did for Walking Dead: establish mood in one image. The name resolves onto that background using the title treatment from 3.4:

```
┌──────────────────────────────────────────────┐
│                                                │
│   [ full-bleed painted scene, muted, moody ]  │
│                                                │
│                                                │
│            ABDULLAH AAMIR                     │ ← distressed
│         a resume, sort of                     │    comic-cover
│                                                │    lettering
│                                                │
└──────────────────────────────────────────────┘
```

Hold on this 1.5 to 2s, then the menu materializes on top (beat 3), rather than cutting to a new screen. The environment art stays as the backdrop for the whole menu. This continuity, one scene, menu fades in over it, is the actual Walking Dead structure, not a separate "menu screen."

**Beat 3: The menu.** A short, plain vertical list, left- or bottom-aligned over the art, exactly like the source material: no boxes, no button chrome, just text with a selection indicator. This is the part people who've only seen screenshots get wrong, they add borders and cards. The real thing is text sitting directly on the painting.

```
┌──────────────────────────────────────────────┐
│   [ same painted scene, now with menu ]       │
│                                                │
│                                                │
│                                                │
│        ▸ NEW GAME                             │ ← selected,
│          CONTINUE          (dim if no save)   │   --signal
│          EPISODES                             │   color +
│          EXTRAS                                │   left arrow
│          OPTIONS                              │
│                                                │
│                                    v1.0        │
└──────────────────────────────────────────────┘
```

Menu semantics, mapped to what each one actually needs to do:

| Label | Behavior |
|---|---|
| **NEW GAME** | Goes to chapter select, starting fresh (resets nothing, just the entry point) |
| **CONTINUE** | Enabled only if `localStorage` shows visited chapters. Jumps to the last one viewed. Hidden entirely, not disabled, if there's no save state. |
| **EPISODES** | Same as chapter select, framed as the direct episode list rather than "new game" |
| **EXTRAS** | This is where `/plain` and the PDF download live. Framed as bonus content, not buried. This is the recruiter escape hatch, dressed as an in-universe menu item instead of an obvious "skip the theme" link. |
| **OPTIONS** | Motion, sound, and typewriter toggles |

- Selection state: the active item shifts slightly right, a small `▸` or arrow appears at `--signal`, text brightens. No box or background fill on selection, that reads as a normal web button, not a game menu.
- Keyboard: up/down arrows move selection, Enter activates. This must work, it is a menu, not decoration.
- A tiny persistent version tag ("v1.0" or similar) bottom-right is a nice authentic touch and costs nothing.
- Ambient motion on this screen is allowed to be a little more than elsewhere: a slow, subtle parallax drift on the background art, or a faint looping detail (smoke, dust, a light flicker) sourced from what's in the art itself. Keep it under `prefers-reduced-motion` control like everything else.

**Copy note:** "A GAME BY" as the eyebrow is doing real work. It sets the frame in three words.

---

### 4.2 Chapter select (`/chapters`)

The nav bar replacement. A grid of episode cards, laid out like Telltale's episode menu.

```
┌──────────────────────────────────────────────┐
│  ← TITLE                        SEASON 1     │
│                                              │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ EPISODE 1  │ │ EPISODE 2  │ │ EPISODE 3 │ │
│  │ ────────── │ │ ────────── │ │ ───────── │ │
│  │ PLACEHOLDER│ │ PLACEHOLDER│ │PLACEHOLDER│ │
│  │ TITLE ONE  │ │ TITLE TWO  │ │TITLE THREE│ │
│  │            │ │            │ │           │ │
│  │ ▸ PLAY     │ │ ▸ PLAY     │ │ ▸ PLAY    │ │
│  └────────────┘ └────────────┘ └───────────┘ │
│  ┌────────────┐ ┌────────────┐               │
│  │ EPISODE 4  │ │ EPISODE 5  │               │
│  │ ...        │ │ ...        │               │
│  └────────────┘ └────────────┘               │
│                                              │
│  ▸ VIEW FULL RESUME (PDF)                    │
└──────────────────────────────────────────────┘
```

- Visited episodes get a subtle `--signal` corner mark. Unvisited ones do not get locked. Nothing is ever locked.
- Each card has a placeholder cover image slot at 16:9. Use a flat two-tone silhouette illustration as the fallback so the grid never looks broken before real art exists.
- Hovering a card plays the panel-lift interaction and dims the other cards to 70% opacity.

---

### 4.3 Episode view (`/chapters/[id]`)

Three-part sequence when an episode opens:

**a) Title card.** Black screen. Episode number in `--signal`, then the title in display face, then a one-line subtitle. Holds 1.4s, or dismisses on click. Skippable, and auto-skipped entirely under reduced motion.

**b) Content panels.** Vertical scroll of comic panels. Each panel is one unit of resume information. Panels alternate width (full, then 2/3 offset left, then 2/3 offset right) so the column never feels like a plain list.

**c) End-of-episode card.** A "NEXT EPISODE" prompt styled like Telltale's episode-end screen, plus a "BACK TO CHAPTERS" option.

---

## 5. The six signature mechanics

These are what make it a Telltale piece rather than a dark-themed portfolio. Build them in this priority order. Mechanics 1, 2, and 6 are essential. 3 through 5 are polish.

### Mechanic 1: The memory toast

The single most recognizable Telltale element. A small panel slides into the bottom-left corner reading:

> **THE RECRUITER WILL REMEMBER THAT.**

Fires when the visitor: opens an episode for the first time, expands a project panel, clicks a choice, or downloads the PDF.

**Implementation notes:**
- Global toast queue. Never show two at once. Queue depth capped at 3, older ones discarded.
- Same visual treatment as a panel: ink border, hard shadow, `--bone` text on `--shadow` fill, with `--signal` only on a thin left bar.
- Vary the copy so it does not get stale. Rotate through a set of variants tied to context, for example: `THE RECRUITER WILL REMEMBER THAT.` / `THIS CHOICE WILL HAVE CONSEQUENCES.` / `YOUR CURIOSITY HAS BEEN NOTED.`
- Screen readers get it via `aria-live="polite"`. It is flavor, so keep it low priority.
- Hard cap: no more than 8 toasts in a session. After that, silently stop. Charm has a half-life.

### Mechanic 2: Dialogue choices as navigation

Anywhere the visitor would normally get a button or a link, give them a dialogue wheel instead. Telltale's four-option layout, flattened into a stacked list on mobile.

```
        ┌─────────────────────────────┐
        │  "Tell me about your work."  │
        └─────────────────────────────┘

   ▸ Show me what you've shipped.
   ▸ What have you built for others?
   ▸ Skip ahead.                    [silence]
```

- Always include a `[silence]` option, styled dimmer. It is the "skip this" affordance and it is very on-brand.
- Selecting an option scrolls to or reveals the matching panel. It does not navigate away. Choices are shortcuts, not gates.
- Full keyboard support: arrow keys move focus, Enter selects, Escape closes.

### Mechanic 3: The relationship meter

A thin persistent bar, top-right, labeled `RECRUITER CONFIDENCE`. Fills as the visitor explores more of the site.

- Starts at 20%. Reaching all five episodes puts it at 100%.
- At 100%, unlock a small easter-egg panel: a "secret ending" that is really just a personal note or a fun fact.
- Keep this extremely subtle. 4px tall bar, no numbers, no percentage label. If it draws attention away from content, shrink it further.
- Persist in `localStorage` under key `tt_resume_progress`.

### Mechanic 4: The branching choice moment

One per season, placed at the end of the projects episode. A genuine two-option fork:

```
   ▸ "Play it safe."
   ▸ "Keep building."
```

Both paths converge on the same outcome panel: a summary of shipped work. The point is the reveal that the answer was the same either way. It is a one-joke mechanic, so use it exactly once.

### Mechanic 5: Ambient detail

Pick two, not all four:
- Faint film grain overlay, 3% opacity, animated at 8fps.
- A very slow parallax on panel backgrounds while scrolling, max 8px travel.
- An optional muted ambient audio loop, default OFF, with a clear toggle. Never autoplay.
- Cursor becomes a small crosshair reticle over interactive elements.

### Mechanic 6: The choice stats screen

This is a real Telltale feature, not an invented one: after key choices, the games show a stats screen with bars like "62% of players chose to spare him." It's one of the most memorable parts of playing these games because it turns a private decision into a shared one.

Adapt it here as a lightweight, honest analytics reveal at the end of an episode:

```
┌──────────────────────────────────────────────┐
│              THIS EPISODE'S CHOICES           │
│                                                │
│  Looked at PocketMunshi first                 │
│  ████████████████░░░░░░░░  68%                │
│                                                │
│  Looked at Dawai Express first                │
│  ████████░░░░░░░░░░░░░░░░  32%                │
│                                                │
│  Read the research episode                    │
│  ██████████░░░░░░░░░░░░░░  41%                │
│                                                │
└──────────────────────────────────────────────┘
```

**Implementation notes:**
- Track real, harmless interaction events, e.g. which project card gets opened first, which episode order visitors take, whether they open EXTRAS before finishing an episode. Nothing personally identifying, no forms, no accounts.
- Store aggregate counts, not per-visitor logs. A simple serverless counter (Cloudflare KV, since the deploy target is already Cloudflare Pages, or a lightweight edge function) incrementing a small set of named counters is enough. No dedicated backend needed.
- If no analytics backend is wired up yet, ship this screen anyway with the dummy percentages shown above. It reads as intentional in a demo and upgrades cleanly to real numbers later, do not block the rest of the build on this.
- Bars fill on scroll-into-view, left to right, 500ms ease-out, staggered 80ms apart.
- Keep the framing honest and light: this is "here's what other visitors did," not a manipulative gamification device. If a stat would be embarrassing or skew the story unfairly (e.g. almost nobody reaches the research episode), that's fine to show as-is. The genuine version is more charming than a curated one.

---

## 6. Placeholder content

Use exactly this. It is sized to match realistic final content so layout does not shift when swapped.

### Episode list (dummy)

| # | Codename | Placeholder title | Placeholder subtitle | Panels |
|---|---|---|---|---|
| 1 | `origins` | THE FIRST SAVE FILE | Where the story starts | 3 |
| 2 | `guild` | ORGANIZED CHAOS | On leading rooms full of people | 4 |
| 3 | `sidequests` | 48 HOURS, NO SLEEP | Competitions, and what came out of them | 4 |
| 4 | `build` | THINGS THAT SHIPPED | Products with real users | 3 |
| 5 | `lab` | THE RESEARCH WING | Questions without answers yet | 2 |

### Panel placeholder text

Each content panel takes this shape. Fill with lorem-adjacent but realistic copy:

```
PANEL HEADER        → 2 to 5 words, display face, uppercase
PANEL TIMESTAMP     → "2024 — Present" style, utility size
PANEL BODY          → 30 to 60 words of plain prose
PANEL TAGS          → 2 to 5 short tags, e.g. React, Python, Neo4j
PANEL LINK          → optional, styled as a dialogue choice
```

Sample dummy body: "Placeholder description for this entry. It should run roughly this long so the panel height matches what the real content will need. Two or three sentences describing what was built, what the constraint was, and what came out of it."

---

## 7. Technical spec

### Stack

- **Framework:** React with Vite, or Next.js if SSR is wanted for SEO on the plain route. Vite is simpler and sufficient.
- **Styling:** Tailwind CSS with the tokens above defined as CSS custom properties in `@layer base`, then referenced through Tailwind's arbitrary value syntax or a custom theme extension.
- **Animation:** Framer Motion. Use `AnimatePresence` for the episode transitions and `useReducedMotion` throughout.
- **Routing:** React Router. Routes: `/`, `/chapters`, `/chapters/:id`, `/plain`.
- **State:** React Context for progress + settings. Persist to `localStorage`. No state library needed.
- **Deploy:** Cloudflare Pages connected to a GitHub repo. Static build, no server needed.

### File structure

```
src/
  main.jsx
  App.jsx
  data/
    episodes.js          ← ALL content lives here. One export.
    toastVariants.js
  context/
    ProgressContext.jsx
    SettingsContext.jsx
  components/
    Panel.jsx            ← the comic panel primitive
    DialogueChoice.jsx
    MemoryToast.jsx
    ToastProvider.jsx
    PresentsCard.jsx     ← beat 1
    TitleReveal.jsx       ← beat 2
    MainMenu.jsx          ← beat 3, renders over the title art
    ChoiceStats.jsx       ← mechanic 6, the percentage bars
    ConfidenceMeter.jsx
    SettingsTray.jsx
    Typewriter.jsx
  screens/
    TitleScreen.jsx
    ChapterSelect.jsx
    EpisodeView.jsx
    PlainResume.jsx
  styles/
    tokens.css
    textures.css         ← halftone + grain SVG data URIs
  assets/
    fonts/
    covers/
    title-art/           ← the painted opening scene, this is worth real effort
```

**Critical:** `data/episodes.js` is the single source of truth for all content. Every component reads from it. This means real content can be dropped in later by editing one file, with zero component changes. Structure it as:

```js
export const episodes = [
  {
    id: 'origins',
    number: 1,
    title: 'THE FIRST SAVE FILE',
    subtitle: 'Where the story starts',
    cover: '/covers/ep1.webp',
    panels: [
      {
        header: 'PLACEHOLDER HEADER',
        timestamp: '2024 — Present',
        body: 'Placeholder description...',
        tags: ['Tag One', 'Tag Two'],
        link: null,
      },
    ],
    choices: [
      { label: 'Tell me more.', target: 'panel-1' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
];
```

### Accessibility floor

- All interactive elements are real `<button>` or `<a>`, never divs with click handlers.
- Visible focus ring: 2px `--signal` outline with 2px offset. Do not remove it.
- Color contrast: `--bone` on `--shadow` and `--ink` on `--paper` both clear WCAG AA. Verify `--signal` on `--paper` before using it for text, it may only pass for large sizes.
- `/plain` route has semantic headings, no ARIA gymnastics, and is linked from every screen.
- Test the whole flow with keyboard only, and with a screen reader on at least the chapter select and one episode.

### Performance floor

- Fonts subset to Latin, WOFF2, preloaded.
- Cover images as WebP, max 1200px wide, lazy loaded below the fold.
- Textures as inline SVG data URIs, not image files.
- Total JS bundle under 200KB gzipped. Framer Motion is the biggest cost, so import only what is used.

---

## 8. Build order

Do it in this sequence. Each phase should be independently viewable.

1. **Scaffold.** Vite + React + Tailwind + Router. Tokens in `tokens.css`. Fonts loaded. Confirm the palette renders.
2. **The Panel primitive.** Build `Panel.jsx` with the irregular clip-path, hard shadow, and halftone texture. Get this right before anything else, because everything is built from it.
3. **The opening sequence.** All three beats from section 4.1: presents card, title reveal over placeholder art, menu fading in on top. This is the first impression, worth building early and getting right rather than bolting on last.
4. **Static screens.** Chapter select, one episode view, all with dummy data from `episodes.js`. No animation yet.
5. **The plain route.** Build `/plain` early, not last. It keeps the content model honest.
6. **Motion pass.** Framer Motion transitions per the table in section 3.5. Wire `useReducedMotion`.
7. **Mechanic 1, 2, and 6.** Toast system, dialogue choices, and the choice-stats screen, wired to dummy percentages if no analytics backend exists yet.
8. **Mechanic 3 and 4.** Confidence meter and the branching moment.
9. **Polish pass.** Pick two ambient details from mechanic 5. Then remove one thing. Ship.
10. **Content swap.** Replace `episodes.js` placeholders with real content, and the title art with the real painted scene.

---

## 9. Prompt to hand an AI coding agent

> Build phase [N] from the attached spec `telltale-portfolio-spec.md`. Follow the design tokens in section 3 exactly, do not substitute colors or typefaces. All content must come from `src/data/episodes.js` and no component may hardcode copy. Respect every rule in section 2. Before writing code, restate which files you will create or modify and why. After building, list anything in the spec you could not implement and why.

---

## 10. Open questions to resolve later

- Real episode titles and content, replacing all of section 6.
- Cover art: commissioned illustration, AI-generated, photographic treatment, or pure typography? Typography-only is the cheapest option and would still look strong given the display face does the heavy lifting.
- Domain and whether this lives on a subdomain of an existing property.
- Whether the PDF resume is a separate design or a rendered version of `/plain`.
- Sound design: worth it, or scope creep? Default answer is scope creep.
