import { Link } from '../components/Link.tsx';
import { AWARDS, CONTACT, EDUCATION, EXPERIENCE, PUBLICATIONS, SKILLS } from '../data/cv.ts';

export function About() {
  return (
    <div className="page about">
      <p className="eyebrow">About</p>
      <h1>Luke McEvoy</h1>
      <p className="lede">
        Physicist and engineer working at the intersection of single-photon optics and machine
        learning. PhD in physics from Stevens Institute of Technology (2026), where I invented the
        Physics-Informed Masked Autoencoder for sparse single-photon LiDAR.
        Core team on QuEra Computing&rsquo;s MHS laser-stabilization pilot with Anthropic.
        Previously at Tesla Autopilot, Quantum Computing Inc., and ASML.
      </p>
      <p className="links">
        <a href={`mailto:${CONTACT.email}`}>Email</a>
        <a href={CONTACT.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={CONTACT.resumePdf} target="_blank" rel="noreferrer">
          Resume (PDF)
        </a>
      </p>

      <section className="cv-section">
        <h2>Education</h2>
        <ul className="cv-edu">
          {EDUCATION.map((d) => (
            <li key={d.degree}>
              <span className="cv-degree">
                {d.degree} {d.field}
              </span>
              <span className="cv-org">{d.school}</span>
              <span className="cv-dates">{d.date}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cv-section">
        <h2>Experience</h2>
        <ol className="cv-roles">
          {EXPERIENCE.map((r) => (
            <li key={`${r.org}-${r.dates}`}>
              <header>
                <span className="cv-role-title">
                  {r.title} · <strong>{r.org}</strong>
                </span>
                <span className="cv-dates">
                  {r.place === '' ? r.dates : `${r.place} · ${r.dates}`}
                </span>
              </header>
              <ul>
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="cv-section">
        <h2>Publications</h2>
        <ol className="cv-pubs">
          {PUBLICATIONS.map((p) => (
            <li key={p.href}>
              <span className="pub-authors">{p.authors}</span>
              <a href={p.href} target="_blank" rel="noreferrer" className="pub-title">
                {p.title}
              </a>
              <span className="pub-venue">
                {p.venue} ({p.year}){p.note !== undefined ? ` — ${p.note}` : ''}
              </span>
            </li>
          ))}
        </ol>
        <p className="prose">
          The dissertation these papers build toward is{' '}
          <Link to="/phd">visualized live on this site</Link>.
        </p>
      </section>

      <section className="cv-section">
        <h2>Skills</h2>
        <ul className="cv-skills">
          {SKILLS.map((s) => (
            <li key={s.label}>
              <span className="cv-skill-label">{s.label}</span>
              <span className="cv-skill-items">{s.items}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cv-section">
        <h2>Awards</h2>
        <ul className="cv-awards">
          {AWARDS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <section className="cv-section">
        <h2>Beyond work</h2>
        <p className="prose">
          Founded and hosted <em>Collision Theory</em> (2020–2024), a podcast interviewing industry
          professionals from Facebook, Twitter, Google, and BlackRock — 500 listeners across six
          continents. Solo backpacker: 32 countries across four continents and counting.
        </p>
      </section>
    </div>
  );
}
