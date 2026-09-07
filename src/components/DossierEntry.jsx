/**
 * One collapsible row inside a `/plain` Dossier section — Experience,
 * Projects, Competitions, Education, Volunteering, Other work. Spun out
 * of `screens/PlainResume.jsx` into its own file (the one new component
 * the Dossier rebuild brief allows) because six of that screen's nine
 * sections render this exact shape and PlainResume.jsx was already long
 * enough without six near-duplicate `<details>` blocks inline.
 *
 * Deliberately NOT `Panel.jsx`/`RevealPanel.jsx` — same call already made
 * on `ChapterSelect.jsx`: the comic-panel primitive (clip-path, offset
 * shadow, halftone) is the content/game layer's language. A document
 * surface uses rules and type. This is a native `<details>`, styled with
 * a hairline bottom border and nothing else.
 *
 * `open`/`onToggle` make this a CONTROLLED component on purpose — the
 * screen's "Expand all"/"Collapse all" buttons, the filter's auto-expand,
 * and the print handler all need to drive every entry's open state at
 * once, which an uncontrolled `<details>` (each managing its own DOM
 * attribute independently) cannot do. `PlainResume.jsx` owns a `Set` of
 * open entry ids; this component only reports the toggle event upward
 * and renders whatever `open` it's given — it holds no state of its own.
 *
 * `entry` is the normalized shape every section builds its rows into
 * before reaching this component (see PlainResume.jsx's `slug`/
 * `*Entries()` helpers): `{ id, title, subline, tags?, body, coursework?,
 * link? }`. Five very different source shapes (profile.js experience/
 * education/volunteering entries, episodes.js panels, profile.js
 * alsoBuilt items) collapse into one shape here so this component only
 * has to know one contract.
 */
export default function DossierEntry({ entry, open, onToggle }) {
  return (
    <details
      id={entry.id}
      open={open}
      onToggle={(event) => onToggle(entry.id, event.currentTarget.open)}
      className="border-b border-ink/15 py-3 first:pt-0 last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="font-display text-sm uppercase leading-snug tracking-[0.03em] text-ink sm:text-base">
            {entry.title}
          </h3>
          {entry.subline ? (
            <p className="mt-0.5 font-body text-xs text-shadow">{entry.subline}</p>
          ) : null}
          {entry.tags?.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <li
                  key={tag}
                  className="border border-ink/25 px-1.5 py-0.5 font-body text-[10px] uppercase tracking-[0.12em] text-shadow"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 font-display text-sm leading-none text-ink/50"
        >
          {open ? '▾' : '▸'}
        </span>
      </summary>

      {/* Print's belt-and-braces CSS override (src/index.css's @media print
          block) forces this div visible regardless of the `open` attribute
          — see that block's comment for why relying on JS state alone
          before a bare Ctrl+P isn't safe. */}
      <div className="mt-3 max-w-[42rem] font-body text-sm leading-relaxed text-ink/85">
        <p>{entry.body}</p>
        {entry.coursework ? (
          <p className="mt-2">
            <strong className="font-semibold text-ink">Selected coursework:</strong>{' '}
            {entry.coursework}
          </p>
        ) : null}
        {entry.link ? (
          <p className="mt-2">
            <a
              href={entry.link}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-ink/40 underline-offset-2 hover:decoration-ink"
            >
              {entry.link}
            </a>
          </p>
        ) : null}
      </div>
    </details>
  );
}
