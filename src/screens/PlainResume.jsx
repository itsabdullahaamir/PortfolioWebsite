import { Link } from 'react-router-dom';
import { episodes, PLAIN_SECTIONS } from '../data/episodes.js';
import { profile } from '../data/profile.js';
import { useToast } from '../components/ToastProvider.jsx';

/**
 * `/plain` — the recruiter escape hatch, spec section 2 rule 3 and the
 * accessibility floor in section 7. A plain semantic ATS-readable
 * document: real headings, no ARIA gymnastics, and deliberately NO theme
 * styling — no --ink/--paper/--signal tokens, no display face, no panel
 * treatment. It inherits the browser's plain black-on-white rendering on
 * purpose; that's the point of this route. Linked from every other screen
 * (TitleScreen's EXTRAS menu item, ChapterSelect's "view full resume"
 * link, EpisodeView's header link).
 *
 * Phase 10: this route is no longer just a dump of episode panels. It
 * builds a real resume from `../data/profile.js` — contact, education,
 * experience, skills, awards, volunteering, certifications — none of
 * which existed in the data before, so a recruiter taking the escape
 * hatch previously could not even find an email address. The name is read
 * from profile.js too rather than hardcoded here, which the old version
 * violated.
 *
 * Episodes are the *curated* game surface, so only the ones that carry
 * material profile.js does not (`plainRole: 'projects'`) are rendered
 * here, under plain headings rather than episode titles.
 * Episodes marked `'covered'` are skipped — their content is already
 * represented by the education/experience/volunteering sections, and
 * rendering both would duplicate every role in two different voices.
 * That editorial call lives in episodes.js, not here.
 *
 * No static PDF file exists yet, so "Download PDF" is wired to
 * window.print() — every browser's print dialog offers "Save as PDF,"
 * which satisfies spec rule 3 without linking to a file that doesn't
 * exist. Swap for a real file link once a PDF asset is added to public/.
 */
export default function PlainResume() {
  const { showToast } = useToast();

  const handleDownload = () => {
    showToast('pdfDownload');
    window.print();
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p>
        <Link to="/">Back to the interactive version</Link>
        {' · '}
        <Link to="/chapters">Chapter select</Link>
      </p>

      <h1>{profile.name}</h1>
      <p>{profile.headline}</p>

      <p>
        <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
        {' · '}
        {profile.contact.location}
        {profile.contact.links.map((link) => (
          <span key={link.url}>
            {' · '}
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          </span>
        ))}
      </p>

      <p>{profile.summary}</p>

      <p>
        <button type="button" onClick={handleDownload}>
          Download / print PDF
        </button>
      </p>

      <section>
        <h2>Education</h2>
        {profile.education.map((entry) => (
          <article key={entry.credential}>
            <h3>
              {entry.credential} — {entry.institution}
            </h3>
            <p>{entry.timespan}</p>
            <p>{entry.detail}</p>
            {entry.coursework ? (
              <p>
                <strong>Selected coursework:</strong> {entry.coursework}
              </p>
            ) : null}
          </article>
        ))}
      </section>

      <section>
        <h2>Experience</h2>
        {profile.experience.map((entry) => (
          <article key={`${entry.role}-${entry.org}`}>
            <h3>
              {entry.role} — {entry.org}
            </h3>
            <p>{entry.timespan}</p>
            <p>{entry.detail}</p>
          </article>
        ))}
      </section>

      {PLAIN_SECTIONS.map(({ role, heading }) => {
        const matching = episodes.filter((episode) => episode.plainRole === role);
        if (!matching.length) return null;

        return (
          <section key={role}>
            <h2>{heading}</h2>
            {matching.flatMap((episode) =>
              episode.panels.map((panel) => (
                <article key={panel.header}>
                  <h3>{panel.header}</h3>
                  <p>{panel.timestamp}</p>
                  <p>{panel.body}</p>
                  {panel.tags?.length ? <p>{panel.tags.join(' · ')}</p> : null}
                  {panel.link ? (
                    <p>
                      <a href={panel.link} target="_blank" rel="noreferrer">
                        {panel.link}
                      </a>
                    </p>
                  ) : null}
                </article>
              )),
            )}
          </section>
        );
      })}

      <section>
        <h2>Other work</h2>
        <ul>
          {profile.alsoBuilt.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong> — {item.detail}
              {item.url ? (
                <>
                  {' '}
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Skills</h2>
        {profile.skills.map((group) => (
          <p key={group.group}>
            <strong>{group.group}:</strong> {group.items.join(', ')}
          </p>
        ))}
      </section>

      <section>
        <h2>Honors &amp; awards</h2>
        <ul>
          {profile.awards.map((award) => (
            <li key={award}>{award}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Volunteering</h2>
        {profile.volunteering.map((entry) => (
          <article key={`${entry.role}-${entry.org}`}>
            <h3>
              {entry.role} — {entry.org}
            </h3>
            <p>{entry.timespan}</p>
            <p>{entry.detail}</p>
          </article>
        ))}
      </section>

      <section>
        <h2>Certifications</h2>
        <ul>
          {profile.certifications.map((cert) => (
            <li key={cert}>{cert}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
