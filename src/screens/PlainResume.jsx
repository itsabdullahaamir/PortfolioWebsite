import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import DossierEntry from '../components/DossierEntry.jsx';
import { episodes, PLAIN_SECTIONS } from '../data/episodes.js';
import { profile } from '../data/profile.js';
import { useToast } from '../components/ToastProvider.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

/**
 * `/plain` — "The Dossier." The recruiter escape hatch, spec section 2
 * rule 3 and the accessibility floor in section 7. Same route, same URL,
 * so every existing link into it (TitleScreen/MainMenu's PLAIN RESUME
 * item, ChapterSelect's "▤ Plain resume", EpisodeView's header link)
 * keeps working untouched.
 *
 * REBUILT this batch from a 197-line unstyled semantic dump — one
 * unbroken column, no index, no jump-to, every entry the same visual
 * weight — into a navigable, filterable document. The live complaint was
 * specific: "extremely hard to navigate and find the stuff we are
 * actually looking for... we have to scroll in all that mess." The fix
 * is structural (an index rail + collapsible entries + a filter), not
 * cosmetic.
 *
 * SURFACE: this screen now carries the site's design language, on the
 * light side of the palette — the paper counterpart to `/chapters`'
 * night city. The previous file's doc comment claimed spec required "NO
 * theme styling"; that was an implementation reading, not spec text.
 * Spec section 7 requires only semantic headings, no ARIA gymnastics,
 * and being linked from every screen — none of which forbid `--ink`/
 * `--paper`/the display face. Print output is still genuinely plain:
 * the `@media print` block in `../index.css` forces true black-on-white
 * regardless of what the live page looks like, so the actual PDF a
 * recruiter saves is unthemed even though the on-screen page isn't.
 *
 * `--signal` budget is exactly TWO uses on this whole screen, spec
 * section 3.1's "at most three" — (1) the active row's rail marker
 * (`border-l-[3px]`/`border-b-2` depending on breakpoint, but it is the
 * SAME single `<a>` element either way — see the `nav` note below for
 * why that unification matters for this exact budget) and (2) the
 * Download / print button. Nothing else in this file may reference
 * `--signal`/`text-signal`/`bg-signal`/`border-signal`.
 *
 * Deliberately NOT using `Panel.jsx`/`RevealPanel.jsx` here — same call
 * already made and documented on `ChapterSelect.jsx`: the comic-panel
 * primitive is the content/game layer's language, not a document
 * surface's. No framer-motion either; the only animated thing on this
 * screen would be the rail's smooth-scroll, which is a plain
 * `scrollIntoView` call, not a Framer Motion component — motion state
 * still combines `useReducedMotion()` with `useSettings().motion`, same
 * pattern as the rest of the app, purely to decide 'smooth' vs 'auto'.
 *
 * NORMALIZATION: six of this screen's nine sections (Experience,
 * Projects, Competitions, Education, Volunteering, Other work) are
 * collapsible `<details>` rows built from five structurally different
 * source shapes — `profile.js`'s `experience[]`/`education[]`/
 * `volunteering[]`/`alsoBuilt[]` and `episodes.js` panels. Rather than
 * writing six near-duplicate render branches, every section's raw data
 * is mapped once into one shared shape (`{ id, title, subline, tags?,
 * body, coursework?, link?, search }`) and rendered through one
 * component, `../components/DossierEntry.jsx`. `search` is a
 * precomputed lowercase concatenation of every field the filter (section
 * F below) is allowed to match against, built once at module load
 * rather than recomputed per keystroke.
 *
 * IDS: every entry needs a stable id that survives the filter changing
 * what's rendered — an array index would not (brief's own warning, and
 * correct: `openIds` is a Set of ids, and if the filter reorders/removes
 * entries an index-keyed id would silently point at the wrong row). Ids
 * are derived deterministically from the entry's own content via `slug()`
 * (`exp-teaching-assistant-department-of-computer-science-fast-nuces`,
 * `proj-mario-in-assembly`, etc.) — verified unique by inspection across
 * every source array, since role/org and panel-header pairs never repeat
 * within a section here.
 *
 * SIGNAL-BUDGET-SAFE RAIL: the desktop "left rail" and the mobile
 * "sticky horizontal chip bar" are NOT two separate elements toggled by
 * CSS breakpoint — they are the SAME `<nav>`/`<a>` set, laid out as a
 * vertical list at `lg:` and a horizontal scroller below it, via
 * `flex-col`/`flex-row` and `border-l`/`border-b` swapping per
 * breakpoint on the identical elements. This is load-bearing for the
 * signal-budget rule above: `getComputedStyle` counts colors on whatever
 * is IN THE DOM regardless of which breakpoint currently hides it via
 * CSS, so two separate marker elements (one per breakpoint) both
 * carrying `border-color: var(--signal)` would blow the budget to 3
 * regardless of viewport width tested. One element, one color source of
 * truth, at every width.
 *
 * ORDER ACROSS BREAKPOINTS: the left-rail column's three children
 * (identity block, nav, the download+back-link row) render in a
 * different visual order on mobile (identity → download+back → nav) than
 * on desktop (identity → nav → download+back — spec section B's own
 * bullet order). Rather than duplicating any of the three, they're
 * ordered via responsive Tailwind `order-*` utilities on one shared flex
 * column — DOM order stays constant (identity, nav, download+back) so
 * Tab order is sane, only paint order moves.
 *
 * PRINT: `handleDownload` keeps the existing `showToast('pdfDownload')`
 * + `window.print()` pattern, but now also flips a `printing` boolean
 * BEFORE calling print — combined with `beforeprint`/`afterprint` window
 * listeners (which fire for a bare Ctrl+P too, not just this button),
 * this is what "expand everything before the PDF is generated" actually
 * means: `printing` ORs into `isEntryOpen()` alongside the filter's own
 * force-open, so every `<details>` renders open the instant either
 * trigger fires, and reverts the instant `afterprint` fires — without
 * ever touching the user's own `openIds` set, so their manual
 * expand/collapse choices survive a print untouched. See `../index.css`
 * for the `@media print` block itself (hides `.dossier-chrome`, forces
 * black-on-white, single column, visible `<details>` content as a CSS
 * belt-and-braces backstop, and appends URLs after external links).
 */

/** Deterministic id fragment from arbitrary content — never an array index. */
function slug(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function experienceEntries() {
  return profile.experience.map((entry) => ({
    id: `exp-${slug(entry.role)}-${slug(entry.org)}`,
    title: entry.role,
    subline: `${entry.org} · ${entry.timespan}`,
    body: entry.detail,
    search: [entry.role, entry.org, entry.timespan, entry.detail].join(' ').toLowerCase(),
  }));
}

/** Shared builder for the two episode-sourced sections (Projects, Competitions). */
function episodePanelEntries(role, prefix) {
  const entries = [];
  episodes
    .filter((episode) => episode.plainRole === role)
    .forEach((episode) => {
      episode.panels.forEach((panel) => {
        entries.push({
          id: `${prefix}-${slug(panel.header)}`,
          title: panel.header,
          subline: panel.timestamp,
          tags: panel.tags,
          body: panel.body,
          link: panel.link,
          search: [panel.header, panel.timestamp, panel.body, (panel.tags ?? []).join(' ')]
            .join(' ')
            .toLowerCase(),
        });
      });
    });
  return entries;
}

function educationEntries() {
  return profile.education.map((entry) => ({
    id: `edu-${slug(entry.credential)}`,
    title: entry.credential,
    subline: `${entry.institution} · ${entry.timespan}`,
    body: entry.detail,
    coursework: entry.coursework,
    search: [entry.credential, entry.institution, entry.timespan, entry.detail, entry.coursework]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }));
}

function volunteeringEntries() {
  return profile.volunteering.map((entry) => ({
    id: `vol-${slug(entry.role)}-${slug(entry.org)}`,
    title: entry.role,
    subline: `${entry.org} · ${entry.timespan}`,
    body: entry.detail,
    search: [entry.role, entry.org, entry.timespan, entry.detail].join(' ').toLowerCase(),
  }));
}

function otherWorkEntries() {
  return profile.alsoBuilt.map((item) => ({
    id: `other-${slug(item.name)}`,
    title: item.name,
    subline: null,
    body: item.detail,
    link: item.url,
    search: [item.name, item.detail, item.url].filter(Boolean).join(' ').toLowerCase(),
  }));
}

function skillRows() {
  return profile.skills.map((group) => ({
    id: `skill-${slug(group.group)}`,
    group: group.group,
    items: group.items,
    search: [group.group, ...group.items].join(' ').toLowerCase(),
  }));
}

function listRows(strings, prefix) {
  return strings.map((text) => ({
    id: `${prefix}-${slug(text)}`,
    text,
    search: text.toLowerCase(),
  }));
}

const projectsHeading = PLAIN_SECTIONS.find((s) => s.role === 'projects')?.heading ?? 'Projects';
const competitionsHeading =
  PLAIN_SECTIONS.find((s) => s.role === 'competitions')?.heading ?? 'Competitions & hackathons';

/*
  Built once at module load, not per-render — every source array here
  (profile.js, episodes.js) is a static import, never changes at
  runtime, so recomputing this on every keystroke of the filter would be
  pure waste. Section order is fixed per the brief's recruiter-priority
  ordering, not alphabetical or data-file order.
*/
const SECTIONS = [
  { id: 'experience', number: '01', heading: 'Experience', kind: 'entries', entries: experienceEntries() },
  {
    id: 'projects',
    number: '02',
    heading: projectsHeading,
    kind: 'entries',
    entries: episodePanelEntries('projects', 'proj'),
  },
  {
    id: 'competitions',
    number: '03',
    heading: competitionsHeading,
    kind: 'entries',
    entries: episodePanelEntries('competitions', 'comp'),
  },
  { id: 'skills', number: '04', heading: 'Skills', kind: 'skills', rows: skillRows() },
  { id: 'education', number: '05', heading: 'Education', kind: 'entries', entries: educationEntries() },
  {
    id: 'awards',
    number: '06',
    heading: 'Honors & awards',
    kind: 'list',
    rows: listRows(profile.awards, 'award'),
  },
  {
    id: 'volunteering',
    number: '07',
    heading: 'Volunteering',
    kind: 'entries',
    entries: volunteeringEntries(),
  },
  { id: 'other-work', number: '08', heading: 'Other work', kind: 'entries', entries: otherWorkEntries() },
  {
    id: 'certifications',
    number: '09',
    heading: 'Certifications',
    kind: 'list',
    rows: listRows(profile.certifications, 'cert'),
  },
];

/* Every collapsible entry's id, across every 'entries'-kind section —
   what "Expand all"/"Collapse all" operate on. */
const ALL_ENTRY_IDS = SECTIONS.filter((s) => s.kind === 'entries').flatMap((s) =>
  s.entries.map((e) => e.id),
);

/** `01  Heading  ───────  N` — used by every section regardless of kind. */
function SectionHeader({ number, heading, count }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="font-display text-sm text-ink/45">{number}</span>
      <h2 className="font-display text-lg uppercase tracking-tight text-ink sm:text-xl">{heading}</h2>
      <span aria-hidden="true" className="h-px flex-1 bg-ink/20" />
      <span className="font-body text-xs uppercase tracking-[0.14em] text-shadow">{count}</span>
    </div>
  );
}

const CONTROL_BUTTON =
  'border border-ink/30 px-3 py-2 font-body text-xs uppercase tracking-[0.12em] text-ink transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-bone';

export default function PlainResume() {
  const { showToast } = useToast();
  const { motion: motionEnabled } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion || !motionEnabled;

  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState(() => new Set());
  const [printing, setPrinting] = useState(false);
  // Headshot is a drop-in file in public/ (profile.photo); if it isn't
  // there yet, hide the frame rather than show a broken-image glyph —
  // same graceful-degradation contract as the episode cover art.
  const [photoBroken, setPhotoBroken] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(SECTIONS[0].id);
  const sectionNodeRefs = useRef({});

  const trimmedQuery = query.trim().toLowerCase();
  const filtering = trimmedQuery.length > 0;

  // Per-section filtered view. Every kind carries `rows`/`entries` plus a
  // `count` (filtered) and `totalCount` (unfiltered) so the rail can show
  // either depending on `filtering`.
  const sectionViews = useMemo(
    () =>
      SECTIONS.map((section) => {
        const source = section.kind === 'entries' ? section.entries : section.rows;
        const filtered = filtering ? source.filter((row) => row.search.includes(trimmedQuery)) : source;
        return {
          ...section,
          entries: section.kind === 'entries' ? filtered : section.entries,
          rows: section.kind !== 'entries' ? filtered : section.rows,
          count: filtered.length,
          totalCount: source.length,
        };
      }),
    [trimmedQuery, filtering],
  );

  const renderedSections = filtering ? sectionViews.filter((s) => s.count > 0) : sectionViews;
  const totalShown = sectionViews.reduce((sum, s) => sum + s.count, 0);
  const totalAll = sectionViews.reduce((sum, s) => sum + s.totalCount, 0);
  const nothingMatches = filtering && totalShown === 0;
  const visibleSectionsKey = renderedSections.map((s) => s.id).join('|');

  const isEntryOpen = useCallback(
    (id) => printing || filtering || openIds.has(id),
    [printing, filtering, openIds],
  );

  // Ignored while a forced-open state (filter or print) is active — the
  // native <details> element still fires onToggle if a visitor clicks a
  // summary that's being held open, and honoring that would silently
  // overwrite the user's own manually-curated open set with noise from a
  // state they didn't choose. Once the force lifts, `openIds` is exactly
  // what it was before — nothing to "restore," because nothing was ever
  // written to it in the first place.
  const toggleEntry = useCallback(
    (id, nextOpen) => {
      if (filtering || printing) return;
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (nextOpen) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [filtering, printing],
  );

  const expandAll = () => setOpenIds(new Set(ALL_ENTRY_IDS));
  const collapseAll = () => setOpenIds(new Set());

  const handleRailClick = useCallback(
    (event, id) => {
      event.preventDefault();
      document.getElementById(id)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      setActiveSectionId(id);
    },
    [reducedMotion],
  );

  // Scrollspy. Re-created whenever the set of actually-rendered sections
  // changes — a filtered-out section has no DOM node to observe, and an
  // observer built against a stale node list would silently do nothing
  // for the sections that just appeared/disappeared.
  useEffect(() => {
    const ids = visibleSectionsKey ? visibleSectionsKey.split('|') : [];
    if (!ids.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSectionId(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    ids.forEach((id) => {
      const node = sectionNodeRefs.current[id];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSectionsKey]);

  // Print. `beforeprint`/`afterprint` cover a bare Ctrl+P, which never
  // touches `handleDownload` at all; `handleDownload` also sets
  // `printing` directly so the DOM has already re-rendered expanded
  // before `window.print()` hands control to the browser, rather than
  // relying solely on event timing.
  useEffect(() => {
    const onBeforePrint = () => setPrinting(true);
    const onAfterPrint = () => setPrinting(false);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

  const handleDownload = () => {
    showToast('pdfDownload');
    setPrinting(true);
    window.print();
  };

  return (
    // `min-h-screen`, NOT `min-h-full` — App.jsx wraps every screen in
    // PageTransition.jsx, which is `display: contents` at rest (no box),
    // so a percentage min-height has nothing to resolve against. Same
    // documented bug ChapterSelect.jsx hit; viewport units skip the
    // containing-block chain entirely. `dossier` is the print block's
    // scope root (../index.css) so those rules can never leak onto the
    // three game screens, which have no print styling of their own.
    <main className="dossier relative min-h-screen bg-paper text-ink">
      <div className="dossier-grid mx-auto flex max-w-[80rem] flex-col gap-10 px-6 py-10 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-12 lg:px-10 lg:py-14">
        {/* LEFT RAIL. Sticky as one block on desktop; a plain stack (no
            sticky) on mobile except for the nav, which pins on its own —
            see the `nav` element below and this file's doc comment. */}
        <aside className="contents lg:sticky lg:top-0 lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:gap-6">
          <div className="order-1 flex flex-col gap-1">
            {profile.photo && !photoBroken ? (
              <img
                src={`${import.meta.env.BASE_URL}${profile.photo}`}
                alt={profile.name}
                width="96"
                height="96"
                onError={() => setPhotoBroken(true)}
                className="mb-3 h-24 w-24 border-2 border-ink object-cover grayscale lg:h-20 lg:w-20"
              />
            ) : null}
            <h1 className="font-display text-xl uppercase leading-tight text-ink sm:text-2xl lg:text-xl">
              {profile.name}
            </h1>
            <p className="font-body text-sm text-shadow">{profile.headline}</p>
            <div className="mt-3 flex flex-col gap-1 font-body text-sm text-ink/80">
              <a
                href={`mailto:${profile.contact.email}`}
                className="underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
              >
                {profile.contact.email}
              </a>
              <span>{profile.contact.location}</span>
              {profile.contact.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Section index. One <nav>, one set of <a> elements, laid out
              as a horizontal scroller (mobile, sticky top-0 of its own)
              or a vertical list (desktop, inside the already-sticky
              aside) via responsive classes on the SAME elements — see
              the doc comment's "SIGNAL-BUDGET-SAFE RAIL" note for why
              this must not be two separate elements.

              Mobile is a horizontal scroller of NINE chips — wider than
              any phone, so it MUST look scrollable. `no-scrollbar` is
              deliberately NOT used here (unlike ChapterSelect's
              filmstrip, which has stepper buttons + arrow keys as extra
              affordances): this bar's only affordance is the bar itself,
              so hiding the scrollbar made a long chip like "03
              COMPETITIONS & HACKATHONS" read as clipped/broken rather
              than as "swipe for more". The thin native scrollbar stays
              on mobile; `lg:overflow-visible` drops the scroll container
              entirely on desktop, so nothing shows there regardless. */}
          <nav
            aria-label="Sections"
            className="dossier-chrome order-3 -mx-6 sticky top-0 z-30 flex gap-1 overflow-x-auto [scrollbar-width:thin] border-y border-ink/15 bg-paper px-6 pb-1.5 pt-2 lg:order-2 lg:static lg:z-auto lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0"
          >
            {sectionViews.map((section) => {
              const isActive = section.id === activeSectionId;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(event) => handleRailClick(event, section.id)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-2 transition-colors duration-150 lg:w-full lg:items-start lg:whitespace-normal lg:border-b-0 lg:border-l-[3px] lg:px-3 lg:py-2 ${
                    isActive ? 'border-signal text-ink' : 'border-transparent text-ink/45 hover:text-ink/70'
                  }`}
                >
                  <span className="font-display text-xs lg:mt-px">{section.number}</span>
                  {/* `lg:whitespace-normal` on the <a> + `min-w-0` here let a
                      long rail label ("Competitions & hackathons", the
                      widest, in the heavy Alfa Slab display face) wrap to a
                      second line inside the fixed 16rem rail instead of
                      overflowing it and shoving the count off the edge. On
                      mobile the label stays on one line — the whole nav is a
                      horizontal scroller there. */}
                  <span className="min-w-0 font-display text-xs uppercase tracking-[0.06em] lg:leading-[1.15] sm:text-[13px]">
                    {section.heading}
                  </span>
                  <span className="ml-auto shrink-0 font-body text-[11px] text-ink/40 lg:mt-px">
                    {filtering ? section.count : section.totalCount}
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Download + back link. Mobile: right under the identity
              block. Desktop: below the index, per the brief's own bullet
              order. Both classed `dossier-chrome` — see ../index.css's
              @media print block; the download button is included there
              too even though the brief's literal list of four chrome
              elements didn't name it, on the judgment call that an
              interactive "print this" control has no reason to appear on
              the resulting printout (see this batch's report). */}
          <div className="order-2 flex flex-col gap-2 lg:order-3">
            <button
              type="button"
              onClick={handleDownload}
              className="dossier-chrome border-2 border-signal bg-signal px-4 py-3 text-center font-display text-xs uppercase tracking-[0.16em] text-bone transition-colors duration-150 hover:border-ink hover:bg-ink"
            >
              Download / print
            </button>
            <Link
              to="/"
              className="dossier-chrome font-body text-xs uppercase tracking-[0.12em] text-ink/70 underline decoration-ink/30 underline-offset-4 hover:text-ink"
            >
              ◂ Back to the interactive site
            </Link>
          </div>
        </aside>

        {/* RIGHT COLUMN: the document itself. */}
        <div className="order-4 min-w-0 max-w-[46rem] lg:order-none">
          {/* The 10-second band. */}
          <div className="grid grid-cols-2 divide-x divide-y divide-ink/20 border border-ink/20 sm:grid-cols-4 sm:divide-y-0">
            {profile.highlights.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 px-4 py-4">
                <span className="font-display text-2xl text-ink sm:text-3xl">{stat.value}</span>
                <span className="font-body text-[11px] uppercase tracking-[0.14em] text-shadow">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 font-body text-base leading-relaxed text-ink/85">{profile.summary}</p>

          {/* Control bar. Not sticky on mobile even though the chip bar
              above it is — stacking two sticky headers (the nav then
              this) fought each other for the same top-of-viewport real
              estate and the brief explicitly allows opting out of that
              rather than fighting it; see this batch's report. */}
          <div className="dossier-chrome mt-6 flex flex-col gap-3 border border-ink/25 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <label htmlFor="dossier-filter" className="sr-only">
                Filter dossier entries
              </label>
              <input
                id="dossier-filter"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter — try “graph”, “teaching”, “Neo4j”"
                className="w-full border border-ink/30 bg-transparent px-3 py-2 font-body text-sm text-ink placeholder:text-ink/40"
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={expandAll} className={CONTROL_BUTTON}>
                Expand all
              </button>
              <button type="button" onClick={collapseAll} className={CONTROL_BUTTON}>
                Collapse all
              </button>
            </div>
          </div>
          {filtering ? (
            <p className="dossier-chrome mt-2 font-body text-xs uppercase tracking-[0.12em] text-shadow">
              Showing {totalShown} of {totalAll} entries
            </p>
          ) : null}

          <div className="mt-10 flex flex-col gap-12">
            {nothingMatches ? (
              <p className="font-body text-sm text-shadow">
                No entries match &ldquo;{query.trim()}&rdquo;.{' '}
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="underline decoration-ink/40 underline-offset-2 hover:decoration-ink"
                >
                  Clear filter
                </button>
              </p>
            ) : (
              renderedSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-16 lg:scroll-mt-6"
                  ref={(node) => {
                    sectionNodeRefs.current[section.id] = node;
                  }}
                >
                  <SectionHeader number={section.number} heading={section.heading} count={section.count} />

                  {section.kind === 'entries' ? (
                    <div className="flex flex-col">
                      {section.entries.map((entry) => (
                        <DossierEntry
                          key={entry.id}
                          entry={entry}
                          open={isEntryOpen(entry.id)}
                          onToggle={toggleEntry}
                        />
                      ))}
                    </div>
                  ) : null}

                  {section.kind === 'skills' ? (
                    <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
                      {section.rows.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink/15 py-3"
                        >
                          <span className="font-display text-sm uppercase tracking-[0.06em] text-ink">
                            {row.group}
                          </span>
                          <span className="font-body text-sm text-ink/80">{row.items.join(' · ')}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {section.kind === 'list' ? (
                    <ul className="flex flex-col divide-y divide-ink/15">
                      {section.rows.map((row) => (
                        <li key={row.id} className="py-2.5 font-body text-sm text-ink/85">
                          {row.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
