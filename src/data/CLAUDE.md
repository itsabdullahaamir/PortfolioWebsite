# src/data/ — content, the single source of truth

Parent: [`../CLAUDE.md`](../CLAUDE.md) → [`/CLAUDE.md`](../../CLAUDE.md).
Any change in this folder updates this file and the root repo map in the
same change.

**This is the only place resume content or toast copy may live.** Per
spec §7: "no component may hardcode copy." If you are building a
component and reach for a string literal that is resume content
(a header, a body paragraph, a tag, a choice label), stop and add it here
instead.

## Files

| File | Status | Notes |
|---|---|---|
| `episodes.js` | ✅ | Exports `episodes` (5 episode objects), `PLAIN_SECTIONS`, `getEpisodeById(id)` and `getNextEpisode(id)`. **Reorganized this batch from chronology to category**, on direct user feedback ("it should NOT be going through my life"): the old `origins`/`guild` split told the story in narrative order (an "origin story" episode mixing school notes-writing, a first hackathon, and university rank; a "roles" episode mixing a paid TA job with unpaid campus leadership), which made "what did they do professionally vs. academically vs. for fun" only answerable by reading every panel. Each episode is now a single category, in this order: `education` (2 panels — university record, pre-university record), `academia` (3 panels — TA, RA, the in-progress paper; a merge of the old `lab` episode plus the TA panel pulled out of `guild`), `guild` (4 panels — campus/community leadership and moderation: ZNotes teaching pulled in from the old `origins`, FOES, NaSCon/TEDx/Isaar, ProSports), `sidequests` (5 panels — every hackathon/competition, now including PakCrypt pulled in from `origins`), `build` (3 panels + the mechanic-4 `branch`, unchanged). Total panel count moved from 16 to 17 as a direct result — no longer a strict spec §6 budget match, since the reorg was the point; word-count bands were re-verified on the two rewritten/moved panels regardless (all still inside 30–60 words body / 2–5 words header). Ids were renamed/reassigned where the category changed (`origins` → `education`; `lab` → `academia`, absorbing `guild`'s old TA panel) — safe because every consumer resolves episodes dynamically via `getEpisodeById`/`useParams`, confirmed by grep, so no other file hardcodes an episode id. `choicePrompt` and `choices` were rewritten per episode to match the new panel order (e.g. `sidequests`' choices now target `panel-0`/`panel-3` since PakCrypt is first and TaxNet moved to index 3). **`PLAIN_SECTIONS` lost its `'research'` entry** — the old `lab` episode used it to render RA/paper panels under a "Research" heading on `/plain`, but now that TA sits in the same episode as RA, giving the whole episode `plainRole: 'research'` would have duplicated the TA role (already covered by `profile.js`'s `experience[]`) in two voices. `academia`'s `plainRole` is `'covered'` instead, and the one piece of unique content that would otherwise have been lost — the in-progress image-processing paper — was folded into the Research Assistant entry's `detail` in `profile.js` so `/plain` doesn't drop it. Verified live: all 5 episodes render their new panels and choices correctly, and `/plain` shows no duplication.

**Phase 10 (content swap) is DONE for this file.** Every title, subtitle, panel body, tag, timestamp, link and choice is real content drawn from the user's master resume — no placeholder prose. `choicePrompt` on every episode is the in-universe line spoken above the choice list, fed to `Typewriter.jsx` via `EpisodeView.jsx`; the `prompt` inside `build.branch` is a *different*, still-unrendered Phase 8 field — don't conflate them. Schema additions made as Opus-level calls per the rule at the bottom of this file: `plainRole` on each episode driving what `/plain` does with it, read via `PLAIN_SECTIONS`; `branch.resolution` on `build`, the convergent outcome copy spec §5 mechanic 4 asks for (still unrendered, Phase 8 work). |
| `profile.js` | ✅ | Exports `profile`: name, headline, summary, contact (email/location/GitHub/LinkedIn), `education[]`, `skills[]`, `awards[]`, `experience[]`, `alsoBuilt[]`, `volunteering[]`, `certifications[]`. Rendered by `../screens/PlainResume.jsx` (all of it) and by `../components/MainMenu.jsx`, which reads **only** `name` and `headline` for the identity block above the menu items — do not widen that second consumer beyond those two fields, everything else here is `/plain`'s job. It exists because `episodes.js` is a curated narrative surface and `/plain` is the recruiter escape hatch required by spec §2 rule 3 — before this file, `/plain` rendered episode panels plus a name hardcoded in JSX, with no contact details, no education and no skills, so a recruiter taking the escape hatch had no way to act on it. **This batch:** the Research Assistant `experience[]` entry's `detail` now also mentions the unpublished image-processing paper — content that used to live only in `episodes.js`'s `lab` episode, which lost its dedicated `plainRole: 'research'` when TA/RA/paper were merged into the `academia` episode (see `episodes.js`'s row above). Without this addition that fact would have silently disappeared from the recruiter escape hatch. Deliberately plain, un-themed resume prose: its only consumer is the plain document. |
| `toastVariants.js` | ✅ | Exports `toastVariants` (copy pool keyed by trigger: `episodeFirstOpen`, `panelExpand`, `choiceMade`, `pdfDownload`, `lateNightWindow`) and `pickToastVariant(trigger, seed)`, which cycles deterministically through the pool for that trigger. Consumed by `../components/ToastProvider.jsx`. **`lateNightWindow` is new:** it is the payoff copy for the title-screen easter egg in `../components/TitleBackdrop.jsx` (the one lit window on an otherwise dark building — click it and someone is still at a desk up there). It is deliberately the only pool written about a person rather than narrating the visitor's own browsing, because the scene is talking back rather than tracking a choice; keep it dry rather than boastful if it's ever extended. |

## Rules for anyone editing content here

- Keep placeholder body copy at roughly the same word count as the real
  content will be (spec §6: "sized to match realistic final content so
  layout does not shift when swapped") — don't shorten placeholders for
  convenience.
- `cover` paths point at `/covers/epN.webp`, which do not exist yet — see
  [`../assets/CLAUDE.md`](../assets/CLAUDE.md). Components consuming
  `episodes.js` should already have a fallback silhouette per spec §4.2
  ("the grid never looks broken before real art exists") — that's a
  component-level concern, not a data-level one.
- The `branch` object on `build` only — this is a one-joke mechanic per
  spec §5 mechanic 4, do not add a second branch to another episode.
- Phase 10 (content swap) is done for `episodes.js`. It did require two
  schema additions (`plainRole`, `branch.resolution`) and one new file
  (`profile.js`); those were made as Opus-level calls, not ad hoc, and
  are documented in the table above. The rule still stands for anyone
  else: a new field per panel/episode is a schema change — flag it as a
  decision for Opus (root `CLAUDE.md` §2) rather than adding it quietly,
  since every component reading this file assumes the current shape.
- **Unresolved facts deliberately kept OUT of the content**, flagged in
  the master resume itself and not to be invented by a later pass:
  the Smart City / "A CITY IN C++" marks (the LaTeX resume claims 134/134,
  the repo's task doc totals 102 — no number appears in the panel until
  that is settled); EduGap's repo URL (the only link on record is an
  `lnkd.in` shortener, so its `link` is `null`); CityMind's repo (not
  found under this GitHub account, may be a teammate's); PocketMunshi and
  the C++ city are private repos, so their `link` is `null` too.
