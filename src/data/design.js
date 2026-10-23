/**
 * The graphic-design surface: real artwork, rendered by
 * ../screens/DesignGallery.jsx at `/design`.
 *
 * `/design` IS A SHARED LINK. The site owner sends this URL to people as
 * proof of the design work, so the route must not be renamed, folded into
 * another screen, or gated behind anything. Add to it; do not move it.
 *
 * Why this is a data file and not markup, same rule as episodes.js and
 * profile.js: no component in this repo hardcodes reader-facing copy. A
 * caption is copy. Adding a piece of work should be an edit HERE and a
 * pair of .webp files in public/design/, with no screen change.
 *
 * Why it is a separate route rather than a sixth episode: the five
 * episodes are paired one-to-one with the five rooms on `/floor` (see the
 * root CLAUDE.md section 0.1 and src/game/CLAUDE.md). A sixth episode
 * would need a sixth minigame whose mechanic is a metaphor for the work,
 * and graphic design does not have one that earns its place. It is also
 * the wrong shape for the game surface in the first place: this is work a
 * visitor needs to LOOK at, full size, in its own colours, which is the
 * opposite of what a drawn ink panel is for. The game surface links here
 * instead, from the pinboard on `/floor`.
 *
 * IMAGE CONTRACT. Every frame below names a basename in public/design/.
 * Two files exist per basename, both WebP, both produced from the
 * original at build-prep time rather than at runtime:
 *
 *   <name>-thumb.webp   longest side 560px, quality 74  (the grid tile)
 *   <name>.webp         longest side 1200px, quality 80 (the lightbox)
 *
 * 1200px is the ceiling the spec section 7 performance floor sets for
 * images, and the two-file split is what keeps the floor honest: tiles
 * are all `loading="lazy"`, and the full-size art is only ever fetched
 * for the one frame a visitor actually opens. The originals run to well
 * over 100MB of PNG and are deliberately NOT in this repo.
 *
 * `w`/`h` are the FULL image's real pixel dimensions. They are recorded
 * here so every tile and the lightbox can reserve the right box before
 * the bytes land. Without them a ninety-tile grid of mixed square,
 * portrait, tall and landscape art reflows as it loads, which is the
 * layout-shift defect ChapterSelect.jsx was already fixed for once (see
 * the root CLAUDE.md phase 4). Frames inside one work share a ratio, so
 * the screen derives its column count from the first frame.
 *
 * COPY RULES, same as episodes.js:
 *  - Describe the artwork, never the people in it. Many frames carry a
 *    teammate's, speaker's or athlete's name and face, and none of that
 *    is this site's to narrate.
 *  - Placeholder names on the certificate ARE called out, since otherwise
 *    "JOHN DOE" reads as a mistake rather than as a template.
 *  - The cricket work is editorial design for a cricket page. The
 *    photographs in it are press images and the statistics are public
 *    record; the captions describe layout and system, never claim the
 *    photography.
 *  - No em dashes in any string here, per the voice pass recorded in
 *    src/data/CLAUDE.md.
 */

export const designProfile = {
  role: 'Executive Member, Media & Marketing',
  org: 'TEDxFASTIslamabad',
  timespan: 'Dec 2025 to Feb 2026',
  eyebrow: 'Graphics',
  title: 'DESIGN WORK',
  summary:
    'Identity systems, announcement series and editorial graphics made for TEDxFASTIslamabad, the FAST Computing Society, and a cricket page I write and design for. Most of what follows is a template rather than a one-off: a card that takes any portrait, a layout that takes any squad, a frame that takes any headline. The job each time was a house style somebody else could keep using after the first piece shipped.',
  note:
    'Shown at the size they were published. Names, faces and photographs belong to the people and events they were made for.',

  // The 10-second band, same idea as profile.js's highlights[].
  highlights: [
    { value: '90', label: 'Pieces shown' },
    { value: '16', label: 'Series and systems' },
    { value: '3', label: 'Organisations' },
  ],

  // UI chrome labels. They live here rather than in the screen for the
  // same reason every other string does: one place to change a word.
  backLabel: 'Previous menu',
  resumeLabel: 'Plain resume',
  chaptersLabel: 'Episode explorer',
  closeLabel: 'Close',
  previousLabel: 'Previous',
  nextLabel: 'Next',
  filterAllLabel: 'Everything',
  emptyLabel: 'Nothing in that filter yet.',
};

/**
 * Filter groups for the sticky bar. `id` must match a work's `category`.
 * Order is the order they appear. Counts are computed in the screen, not
 * stored here, so they can never drift from the data.
 */
export const designCategories = [
  { id: 'identity', label: 'Identity systems' },
  { id: 'editorial', label: 'Editorial & social' },
  { id: 'process', label: 'Process' },
];

export const designWorks = [
  // ---------------------------------------------------------------
  // TEDxFASTIslamabad 2026
  // ---------------------------------------------------------------
  {
    id: 'ec-series',
    number: '01',
    category: 'identity',
    org: 'TEDxFASTIslamabad',
    title: 'EXECUTIVE COUNCIL SERIES',
    kind: 'Announcement system, fifteen cards',
    note:
      'The card that introduced every member of the 2026 Executive Council. One studio setup, one thin red keyline holding the frame, the name set large in a distressed face along the bottom edge and the role in small tracked caps beneath it. Everything except the photograph and the two lines of type is fixed, so a council of fifteen could be set and shipped in an afternoon without any of them drifting apart.',
    tags: ['Identity system', 'Instagram', 'Series template'],
    frames: [
      { name: 'ec-president-sitting', caption: 'President, seated', w: 960, h: 1200 },
      { name: 'ec-president-standing', caption: 'President, standing', w: 960, h: 1200 },
      { name: 'ec-haseeb', caption: 'Director, Media and Marketing', w: 960, h: 1200 },
      { name: 'ec-taha', caption: 'Director, Operations', w: 960, h: 1200 },
      { name: 'ec-nawal', caption: 'Director, Outreach and Finance', w: 960, h: 1200 },
      { name: 'ec-saad', caption: 'Director, Security and Protocol', w: 960, h: 1200 },
      { name: 'ec-lubabah', caption: 'Director, Info and Registrations', w: 960, h: 1200 },
      { name: 'ec-fazeelat', caption: 'Curator', w: 960, h: 1200 },
      { name: 'ec-zarlish', caption: 'Associate Director, Media', w: 960, h: 1200 },
      { name: 'ec-hamnah', caption: 'Associate Director, Media', w: 960, h: 1200 },
      { name: 'ec-asadullah', caption: 'Associate Director, Info', w: 960, h: 1200 },
      { name: 'ec-faisal', caption: 'Associate Director, Operations', w: 960, h: 1200 },
      { name: 'ec-zuhak', caption: 'Associate Director, Outreach', w: 960, h: 1200 },
      { name: 'ec-mentor-1', caption: 'Mentor', w: 960, h: 1200 },
      { name: 'ec-mentor-2', caption: 'Mentor', w: 960, h: 1200 },
    ],
  },
  {
    id: 'ec-titles',
    number: '02',
    category: 'identity',
    org: 'TEDxFASTIslamabad',
    title: 'TITLE AND SECTION CARDS',
    kind: 'Announcement system, six cards',
    note:
      'The frames that open each run of member cards and tell a scrolling feed which part of the council it is looking at. Same ground and same lockup as the cards they introduce, but the portrait drops out and the type carries the whole frame, so a section break reads as a pause rather than as another person.',
    tags: ['Typography', 'Instagram', 'Series template'],
    frames: [
      { name: 'ec-title-president', caption: 'President', w: 960, h: 1200 },
      { name: 'ec-title-council', caption: 'Media and Marketing, Executive Council', w: 960, h: 1200 },
      { name: 'ec-title-directorate', caption: 'Directorate, Media and Marketing', w: 960, h: 1200 },
      { name: 'ec-title-team', caption: 'Team, Media and Marketing', w: 960, h: 1200 },
      { name: 'ec-title-curator', caption: 'Curator', w: 960, h: 1200 },
      { name: 'ec-title-mentors', caption: 'Mentors', w: 960, h: 1200 },
    ],
  },
  {
    id: 'ec-groups',
    number: '03',
    category: 'identity',
    org: 'TEDxFASTIslamabad',
    title: 'DIRECTORATE GROUP CARDS',
    kind: 'Announcement system, six cards',
    note:
      'The same system widened to hold a whole directorate in one frame. The keyline and the name plate stay exactly where they sit on a solo card, so a group shot drops into a feed of portraits without breaking the rhythm, and the directorate name takes the slot a member name would have taken.',
    tags: ['Group portrait', 'Instagram', 'Series template'],
    frames: [
      { name: 'ec-group-media', caption: 'Media and Marketing', w: 960, h: 1200 },
      { name: 'ec-group-ops', caption: 'Operations, Logistics and Decor', w: 960, h: 1200 },
      { name: 'ec-group-outreach', caption: 'Outreach and Finance', w: 960, h: 1200 },
      { name: 'ec-group-info', caption: 'Info and Registration', w: 960, h: 1200 },
      { name: 'ec-group-security', caption: 'Security and Protocol', w: 960, h: 1200 },
      { name: 'ec-team-post', caption: 'Team post', w: 960, h: 1200 },
    ],
  },
  {
    id: 'speaker-series',
    number: '04',
    category: 'identity',
    org: 'TEDxFASTIslamabad',
    title: 'SPEAKER CARDS',
    kind: 'Announcement system, ten cards',
    note:
      'The light half of the same identity. A speaker is announced on paper white rather than studio black, with an oversized red X anchored behind the figure and a faint line pattern filling the ground. The name splits across two weights so the surname lands first at thumbnail size, and the credit line underneath takes anything from one role to four without the lockup moving.',
    tags: ['Identity system', 'Instagram', 'Typography'],
    frames: [
      { name: 'spk-hasan', caption: 'Head of School and mentor', w: 600, h: 1200 },
      { name: 'spk-aftab', caption: 'Rector', w: 600, h: 1200 },
      { name: 'spk-waseem', caption: 'Campus director', w: 600, h: 1200 },
      { name: 'spk-omar-baig', caption: 'Professor of AI and data science', w: 600, h: 1200 },
      { name: 'spk-syed-ahmed', caption: 'Chief executive', w: 600, h: 1200 },
      { name: 'spk-imtinan', caption: 'Educator and strategist', w: 600, h: 1200 },
      { name: 'spk-maaz-ali', caption: 'Entrepreneur and technologist', w: 600, h: 1200 },
      { name: 'spk-murtaza', caption: 'Musician', w: 600, h: 1200 },
      { name: 'spk-hadia', caption: 'Alumna', w: 600, h: 1200 },
      { name: 'spk-saad-abid', caption: 'Student speaker', w: 600, h: 1200 },
    ],
  },
  {
    id: 'certificate',
    number: '05',
    category: 'identity',
    org: 'TEDxFASTIslamabad',
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
    number: '06',
    category: 'identity',
    org: 'TEDxFASTIslamabad',
    title: 'CORE TEAM CARD',
    kind: 'Social post, series template',
    note:
      'A crimson band crosses the frame on the diagonal carrying a repeated CORE TEAM lockup, a grey keyline frames the cut-out portrait, and the name breaks across two lines in white and grey so the surname still reads at thumbnail size. The quieter sibling beside it swaps the cut-out for a rounded tile with one corner notched, for members whose photograph came in on a background that could not be cut cleanly.',
    tags: ['Portrait cut-out', 'Instagram', 'Series template'],
    frames: [
      { name: 'committee-card', caption: 'Core team card', w: 591, h: 1004 },
      { name: 'speaker-card', caption: 'Simple cut, for an uncut portrait', w: 591, h: 1004 },
    ],
  },

  // ---------------------------------------------------------------
  // FAST Computing Society
  // ---------------------------------------------------------------
  {
    id: 'fcs-session',
    number: '07',
    category: 'identity',
    org: 'FAST Computing Society',
    title: 'SESSION COVER',
    kind: 'Event cover, 16:9',
    note:
      'Cover art for a recorded talk, built for the one place it had to work: a 16:9 tile in a feed, at the size a thumb scrolls past it. A photograph from the session itself sits washed under a red grade on the left to hold the title, the two marks lock up small and centred at the top, and the guest is cut out and pushed to the right edge at full contrast so the face survives the crop.',
    tags: ['Event cover', 'Thumbnail', 'Photo treatment'],
    frames: [
      { name: 'fcs-tabarak', caption: 'Session cover', w: 1200, h: 675 },
    ],
  },

  // ---------------------------------------------------------------
  // Extra Innings with Abdullah
  // ---------------------------------------------------------------
  {
    id: 'eia-xi',
    number: '08',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'BEST PLAYING XI',
    kind: 'Editorial series, one card per side',
    note:
      'A squad card that had to hold eleven names, a captain mark, a wicketkeeper mark and an availability note without turning into a spreadsheet. The list runs down a flat colour panel keyed to each side, the panel is cut on a slight angle so the photograph behind it reads as depth rather than as a background, and the numerals sit in their own column so the eye can count without reading.',
    tags: ['Editorial', 'Information design', 'Series template'],
    frames: [
      { name: 'eia-xi-1', caption: 'Franchise card, purple', w: 1080, h: 1080 },
      { name: 'eia-xi-2', caption: 'Franchise card, yellow', w: 1080, h: 1080 },
      { name: 'eia-xi-3', caption: 'Franchise card, green', w: 1080, h: 1080 },
      { name: 'eia-xi-4', caption: 'Franchise card, navy', w: 1069, h: 1069 },
    ],
  },
  {
    id: 'eia-teams',
    number: '09',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'BEST POSSIBLE XI, BY NATION',
    kind: 'Editorial series, eight cards',
    note:
      'The same problem as the franchise cards solved for a different scale: an all-time side per nation, which means more names, a bench underneath the eleven and a flag that has to sit in the lockup without becoming the loudest thing in the frame. Each card takes its ground from the national kit, and the indent rule under the main list is what separates a first-choice side from the reserves at a glance.',
    tags: ['Editorial', 'Information design', 'Colour system'],
    frames: [
      { name: 'eia-team-pak', caption: 'Pakistan, ODI', w: 1080, h: 1080 },
      { name: 'eia-team-pak-test', caption: 'Pakistan, Test', w: 1080, h: 1080 },
      { name: 'eia-team-ind', caption: 'India', w: 1080, h: 1080 },
      { name: 'eia-team-aus', caption: 'Australia', w: 1080, h: 1080 },
      { name: 'eia-team-sa', caption: 'South Africa', w: 1080, h: 1080 },
      { name: 'eia-team-nz', caption: 'New Zealand', w: 1080, h: 1080 },
      { name: 'eia-team-world-odi', caption: 'World XI, ODI', w: 1080, h: 1080 },
      { name: 'eia-team-world-test', caption: 'World XI, Test', w: 1080, h: 1080 },
    ],
  },
  {
    id: 'eia-asiacup',
    number: '10',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'THE LEGACY OF ASIA CUP',
    kind: 'Editorial series, six frames',
    note:
      'A retrospective run where each frame carries one match. The archive photograph is dropped into a white border so it reads as something pulled out of a box rather than posted fresh, the series title stays locked at the top of every frame so the run is recognisable mid-scroll, and the only thing that changes position is the pull quote naming what that particular match was.',
    tags: ['Editorial', 'Series template', 'Archive imagery'],
    frames: [
      { name: 'eia-asiacup-1', caption: 'The showdown', w: 1080, h: 1080 },
      { name: 'eia-asiacup-2', caption: 'Completely outclassed', w: 1080, h: 1080 },
      { name: 'eia-asiacup-3', caption: 'The all-round masterclass', w: 1080, h: 1080 },
      { name: 'eia-asiacup-4', caption: 'The toughest of finals', w: 1080, h: 1080 },
      { name: 'eia-asiacup-5', caption: 'The home derby', w: 1080, h: 1080 },
      { name: 'eia-asiacup-6', caption: 'The snatched win', w: 1080, h: 1080 },
    ],
  },
  {
    id: 'eia-features',
    number: '11',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'FEATURE POSTS',
    kind: 'One-offs, six frames',
    note:
      'The posts that were not part of any series, which is exactly what makes them the range. A recommendation post built out of torn paper and a halftone crop, an award card built as a tilted frame inside a frame, a question post where the type IS the artwork, and a list post that had to stay readable at the bottom of a feed. Each one sets its own rules and then keeps them.',
    tags: ['Editorial', 'Layout', 'Typography'],
    frames: [
      { name: 'eia-the-test', caption: 'Watch recommendation', w: 640, h: 640 },
      { name: 'eia-poty-2023', caption: 'Player of the year', w: 1080, h: 1080 },
      { name: 'eia-worldcup-who', caption: 'Question post', w: 1080, h: 1080 },
      { name: 'eia-odi11-2023', caption: 'Team of the year', w: 1080, h: 1080 },
      { name: 'eia-flop11', caption: 'Flop XI', w: 1080, h: 1080 },
      { name: 'eia-tour-nz', caption: 'Tour squad', w: 1200, h: 1200 },
    ],
  },
  {
    id: 'eia-heroes',
    number: '12',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'PLAYER GRAPHICS',
    kind: 'Hero posts, five frames',
    note:
      'Single-figure posts where the whole job is the cut-out and the ground behind it. No lists, no stats panel, nothing to read except a name: the figure is masked out of a press photograph, the type is set oversized and then partly hidden behind the body so the two occupy the same space, and the background is built from flat shapes and grain rather than from another photograph.',
    tags: ['Photo treatment', 'Type masking', 'Composition'],
    frames: [
      { name: 'eia-hero-shaheen', caption: 'Bowler, red ground', w: 960, h: 1200 },
      { name: 'eia-hero-babar', caption: 'Milestone post', w: 997, h: 1200 },
      { name: 'eia-hero-green', caption: 'Vertical name lockup', w: 1080, h: 1079 },
      { name: 'eia-hero-grey', caption: 'Monochrome ground', w: 960, h: 1200 },
      { name: 'eia-wtc-review', caption: 'Cycle review', w: 960, h: 1200 },
    ],
  },
  {
    id: 'eia-fixtures',
    number: '13',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'FIXTURE AND SQUAD CARDS',
    kind: 'Utility posts, four frames',
    note:
      'The least glamorous posts on the page and the ones with the tightest brief: a reader should get the venue, the date and the start time without reading a sentence. Dates sit in their own blocks, the two sides are separated by the fold of the layout rather than by a label, and everything that is not a number is set small so the numbers carry the frame.',
    tags: ['Information design', 'Layout', 'Utility'],
    frames: [
      { name: 'eia-tour-nz-test', caption: 'Test tour fixtures', w: 1080, h: 1080 },
      { name: 'eia-tour-eng', caption: 'Tour card', w: 1080, h: 1080 },
      { name: 'eia-squad-asiangames', caption: 'Squad announcement', w: 675, h: 675 },
      { name: 'eia-t20wc-groupa', caption: 'Group preview', w: 1080, h: 1080 },
    ],
  },
  {
    id: 'eia-review',
    number: '14',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'YEAR IN REVIEW',
    kind: 'Editorial set, three frames',
    note:
      'A set that had to look like one thing across three posts published on different days. The ground, the brushed banner behind the heading and the position of the credit line are identical in all three; only the heading changes, and it changes weight rather than size, so the set reads as chapters of one review instead of three separate posts that happen to share a colour.',
    tags: ['Editorial', 'Set design', 'Typography'],
    frames: [
      { name: 'eia-review-games', caption: 'Best games of the year', w: 1080, h: 1080 },
      { name: 'eia-review-players', caption: 'Best players of the year', w: 1080, h: 1080 },
      { name: 'eia-review-performances', caption: 'Best individual performances', w: 1080, h: 1080 },
    ],
  },
  {
    id: 'eia-earlier',
    number: '15',
    category: 'editorial',
    org: 'Extra Innings with Abdullah',
    title: 'EARLIER WORK',
    kind: 'Archive, four frames',
    note:
      'Where the page started. The lists are denser, the grounds are busier and the type does more work than it needs to, which is the honest reason they are here: the franchise and nation cards further up this page are the same problem solved again after a year of making these. Kept so the gap is visible rather than tidied away.',
    tags: ['Archive', 'Editorial', 'Early work'],
    frames: [
      { name: 'eia-profile-bradman', caption: 'Player profile', w: 1080, h: 1080 },
      { name: 'eia-psl-best11', caption: 'Tour XI', w: 1080, h: 1080 },
      { name: 'eia-psl8-xi', caption: 'Season XI', w: 1080, h: 1080 },
      { name: 'eia-wisden-t20i', caption: 'Team of the year', w: 1080, h: 1080 },
    ],
  },

  // ---------------------------------------------------------------
  // Process
  // ---------------------------------------------------------------
  {
    id: 'ec-iteration',
    number: '16',
    category: 'process',
    org: 'TEDxFASTIslamabad',
    title: 'FIRST PASS, AND WHAT REPLACED IT',
    kind: 'Process, eight frames',
    note:
      'The council cards were drawn twice. The first pass set the role oversized in a condensed italic and masked the portrait into it, which looked strong as a single post and fell apart as a system: at fifteen members the type had to shrink to fit longer roles, and the masking meant every new photograph was a fresh cut rather than a drop-in. The second pass gave the type its own strip along the bottom and let the keyline do the holding, which is why the shipped series above could be set in an afternoon. The four background treatments below are the same artwork tested against a textile, a darkened textile, a vignette and a flat red.',
    tags: ['Iteration', 'Type masking', 'System design'],
    frames: [
      { name: 'ec-old-president', caption: 'First pass, president', w: 960, h: 1200 },
      { name: 'ec-old-member', caption: 'First pass, director', w: 960, h: 1200 },
      { name: 'team-deputy', caption: 'First pass, textile ground', w: 960, h: 1200 },
      { name: 'team-director-textile', caption: 'First pass, full textile', w: 960, h: 1200 },
      { name: 'team-director-vignette', caption: 'First pass, darkened and vignetted', w: 960, h: 1200 },
      { name: 'team-director-flat', caption: 'First pass, flat red', w: 960, h: 1200 },
      { name: 'team-cover-textured', caption: 'First pass, cover', w: 960, h: 1200 },
      { name: 'team-cover-flat', caption: 'First pass, flatter cover', w: 960, h: 1200 },
    ],
  },
];

/** Flat list of every frame, in render order, for the lightbox to page through. */
export const designFrames = designWorks.flatMap((work) =>
  work.frames.map((frame) => ({
    ...frame,
    workId: work.id,
    workTitle: work.title,
    category: work.category,
  })),
);

export function frameIndexOf(name) {
  return designFrames.findIndex((frame) => frame.name === name);
}
