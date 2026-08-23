# Content draft — fill this in, then hand it back

This is the input for Phase 10 (spec §8 step 10). Write plainly here; I
restructure it into `src/data/episodes.js`. Nothing here needs to be
formatted as code — prose in the blanks is fine.

Rules that shape the answers:
- Panel `body` wants **40–60 words**. Longer overflows the panel shape.
- `header` is a short all-caps label (2–4 words), not a sentence.
- Every claim a recruiter cares about must survive being read flat, with
  no game framing, on `/plain`.

---

## 0. Profile block (NEW — currently missing entirely)

`/plain` today renders only episode panels plus a hardcoded name. There is
no contact info, education, or skills list anywhere in the data. A
recruiter cannot act on the page. Fill this in:

- Full name:
- One-line descriptor (e.g. "CS undergrad, builds things that ship"):
- Email (shown publicly?  yes / no):
- Location:
- GitHub / LinkedIn / personal site URLs:
- Degree, institution, graduation year:
- Skills, grouped (languages / frameworks / tools):
- Link to a real PDF resume, if one exists:

## 1. Episode titles

Current titles are invented. Keep, rename, or cut each. Five is not
mandatory — four strong episodes beat five padded ones.

| # | id | Current title | Current subtitle | Your version |
|---|---|---|---|---|
| 1 | `origins` | THE FIRST SAVE FILE | Where the story starts | |
| 2 | `guild` | ORGANIZED CHAOS | On leading rooms full of people | |
| 3 | `sidequests` | 48 HOURS, NO SLEEP | Competitions, and what came out of them | |
| 4 | `build` | THINGS THAT SHIPPED | Products with real users | |
| 5 | `lab` | THE RESEARCH WING | Questions without answers yet | |

## 2. Panels (16 total)

For each, give me: header, date range, what actually happened (40–60
words), 2–3 tags, and a link if there is one.

### Ep 1 — origins (3 panels)
1. HOW IT STARTED (2018–2020):
2. EARLY EXPERIMENTS (2020–2021):
3. FIRST REAL PROJECT (2021):

### Ep 2 — guild (3 panels)
1. BUILDING THE ROOM (2022–Present):
2. KEEPING IT RUNNING:
3. (third panel):

### Ep 3 — sidequests (3 panels)
1.
2.
3.

### Ep 4 — build (3 panels) — the projects episode
1.
2.
3.

Also, mechanic 4's branching moment lives at the end of this episode. Both
options must converge on the same summary panel. Current placeholders are
"Play it safe." / "Keep building." — change them, and tell me what the
convergent summary panel should say.

### Ep 5 — lab (2 panels)
1. CURRENT QUESTION (2025–Present):
2. WHY IT MATTERS:

## 3. Art (blocks the title reveal and chapter grid)

Both asset folders are empty; screens use placeholder fallbacks today.

- **Title art** — one painted/illustrated scene, the Telltale cover look.
  Dark enough that off-white lettering reads on top of it. Drop the file
  in `src/assets/title-art/` and I wire it (one constant in
  `TitleReveal.jsx`).
- **Episode covers** — five images, WebP, ≤1200px wide, into
  `src/assets/covers/`. If you would rather ship without real covers, say
  so and I will make the silhouette fallback deliberate rather than
  temporary.

## 4. Choice-stats numbers (mechanic 6, Phase 7)

No analytics backend exists. Spec explicitly permits honest dummy numbers.
Confirm you are fine with hardcoded percentages, or say to cut mechanic 6.
