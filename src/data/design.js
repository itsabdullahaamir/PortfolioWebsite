/**
 * The graphic-design surface: real artwork produced for TEDxFASTIslamabad
 * 2026, rendered by ../screens/DesignGallery.jsx at `/design`.
 *
 * Why this is a data file and not markup, same rule as episodes.js and
 * profile.js: no component in this repo hardcodes reader-facing copy. A
 * caption is copy. Adding a new piece of work should be an edit HERE and
 * a pair of .webp files in public/design/, with no screen change.
 *
 * Why it is a separate route rather than a sixth episode: the five
 * episodes are paired one-to-one with the five rooms on `/floor` (see the
 * root CLAUDE.md section 0.1 and src/game/CLAUDE.md). A sixth episode
 * would need a sixth minigame whose mechanic is a metaphor for the work,
 * and graphic design does not have one that earns its place. It is also
 * the wrong shape for the game surface in the first place: this is work a
 * visitor needs to LOOK at, full size, in its own colours, which is the
 * opposite of what a drawn ink panel is for. So it lives beside the
 * reading surfaces instead, ungated, exactly like `/plain`.
 *
 * IMAGE CONTRACT. Every frame below names a basename in public/design/.
 * Two files exist per basename, both WebP, both produced from the
 * original PNG at build-prep time rather than at runtime:
 *
 *   <name>-thumb.webp   longest side 640px, quality 78  (the grid tile)
 *   <name>.webp         longest side 1200px, quality 82 (the lightbox)
 *
 * 1200px is the ceiling the spec section 7 performance floor sets for
 * images, and the two-file split is what keeps the floor honest: the ten
 * tiles that paint on arrival cost ~320KB between them and are all
 * `loading="lazy"`, while the ~1.2MB of full-size art is only ever
 * fetched for the one frame a visitor actually opens. The originals are
 * 17.7MB of PNG and are deliberately NOT in this repo.
 *
 * `w`/`h` are the FULL image's real pixel dimensions. They are recorded
 * here so every tile and the lightbox can reserve the right box before
 * the bytes land. Without them a 10-tile grid of mixed portrait and
 * landscape art reflows as it loads, which is the layout-shift defect
 * ChapterSelect.jsx was already fixed for once (see the root CLAUDE.md
 * phase 4). Thumbnails share the aspect ratio, so one pair covers both.
 *
 * COPY RULES, same as episodes.js: describe the artwork, never the people
 * in it. Several frames carry a teammate's name and face and one carries
 * a portrait that is plainly a stand-in, and none of that is this site's
 * to narrate. Placeholder names on the certificate ARE called out, since
 * otherwise "JOHN DOE" reads as a mistake rather than as a template. No
 * em dashes in any string here, per the voice pass recorded in
 * src/data/CLAUDE.md.
 */

export const designProfile = {
  role: 'Executive Member, Media & Marketing',
  org: 'TEDxFASTIslamabad',
  timespan: 'Dec 2025 to Feb 2026',
  eyebrow: 'Graphics',
  title: 'DESIGN WORK',
  subtitle: 'Selected graphics for TEDxFASTIslamabad 2026',
  summary:
    'Graphics for the 2026 edition of TEDxFASTIslamabad, an independently organized TED event. The brief was a house style the rest of the team could keep using after any one piece shipped, so most of what follows is a template rather than a one-off: one certificate that works on two grounds, one member card that takes any portrait, one announcement set that takes any role. TED red, near-black and a single grey stay fixed across all of it.',
  note:
    'Shown at the size they were published. Names and portraits belong to the committee members and speakers they were made for.',

  // UI chrome labels. They live here rather than in the screen for the
  // same reason every other string does: one place to change a word.
  backLabel: 'Previous menu',
  resumeLabel: 'Plain resume',
  chaptersLabel: 'Episode explorer',
  closeLabel: 'Close',
  previousLabel: 'Previous',
  nextLabel: 'Next',
};

export const designWorks = [
  {
    id: 'certificate',
    number: '01',
    title: 'CERTIFICATE OF RECOGNITION',
    kind: 'Print template, two grounds',
    note:
      'Issued to speakers, volunteers and partners. One layout drawn twice so it survives both outputs it had to survive: printed on dark stock, and run off whatever office printer was free that week. The chevrons are the same red at three opacities rather than three separate colours, which is what lets the light version stay legible without being redrawn. Three signature rules sit on a shared baseline so the names align whoever ends up signing. Shown with placeholder names.',
    tags: ['Certificate', 'Two-ground system', 'Print'],
    frames: [
      { name: 'certificate-dark', caption: 'Dark ground, for printing on stock', w: 1200, h: 848 },
      { name: 'certificate-light', caption: 'Light ground, for an office printer', w: 1200, h: 848 },
    ],
  },
  {
    id: 'committee-card',
    number: '02',
    title: 'ORGANIZING COMMITTEE CARD',
    kind: 'Social post, series template',
    note:
      'The card that introduced each member of the Organizing Committee. A crimson band crosses the frame on the diagonal carrying a repeated CORE TEAM lockup, a grey keyline frames the cut-out portrait, and the name breaks across two lines in white and grey so the surname still reads at thumbnail size. Everything except the photograph and the two name lines is fixed, so the rest of the committee could be set in minutes.',
    tags: ['Portrait cut-out', 'Instagram', 'Series template'],
    frames: [
      { name: 'committee-card', caption: 'Core team card', w: 591, h: 1004 },
    ],
  },
  {
    id: 'speaker-card',
    number: '03',
    title: 'TEAM CARD, SIMPLE CUT',
    kind: 'Social post, series template',
    note:
      'The quieter card in the same family, for members whose photograph came in on a plain background and could not be cut out cleanly. The portrait sits in a rounded tile with one corner notched out, an orbital ring and a four-point star carry the eye down to the name, and the team sits under it in tracked caps. Same palette, same name treatment, a third of the work to produce.',
    tags: ['Instagram', 'Series template', 'Typography'],
    frames: [
      { name: 'speaker-card', caption: 'Team card', w: 591, h: 1004 },
    ],
  },
  {
    id: 'team-announcement',
    number: '04',
    title: 'TEAM ANNOUNCEMENT CAROUSEL',
    kind: 'Instagram carousel, six frames',
    note:
      'The set announcing the Media and Marketing team. A cover frame opens it and a role frame follows per member, with the role set oversized in a condensed italic that the portrait is masked into, so the person stands in front of their own title rather than beside it. The four backgrounds here are the ground being tested against the same artwork: a full-bleed woven textile, the same textile darkened, a vignette, and a flat red. The flat red is the one that let the type stay readable once Instagram had compressed it.',
    tags: ['Instagram', 'Carousel', 'Type masking'],
    frames: [
      { name: 'team-cover-textured', caption: 'Cover, textile ground', w: 960, h: 1200 },
      { name: 'team-cover-flat', caption: 'Cover, flatter ground', w: 960, h: 1200 },
      { name: 'team-deputy', caption: 'Deputy, Media and Marketing', w: 960, h: 1200 },
      { name: 'team-director-textile', caption: 'Director, full textile ground', w: 960, h: 1200 },
      { name: 'team-director-vignette', caption: 'Director, darkened and vignetted', w: 960, h: 1200 },
      { name: 'team-director-flat', caption: 'Director, flat red ground', w: 960, h: 1200 },
    ],
  },
];

/** Flat list of every frame, in render order, for the lightbox to page through. */
export const designFrames = designWorks.flatMap((work) =>
  work.frames.map((frame) => ({ ...frame, workId: work.id, workTitle: work.title })),
);

export function frameIndexOf(name) {
  return designFrames.findIndex((frame) => frame.name === name);
}
