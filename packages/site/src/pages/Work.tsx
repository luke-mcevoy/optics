import { Link } from '../components/Link.tsx';
import { workBySlug } from '../data/works.ts';
import { Live } from '../viz/Live.tsx';

export function Work({ slug }: { slug: string }) {
  const work = workBySlug(slug);
  if (work === undefined) {
    return (
      <div className="page">
        <p className="eyebrow">Missing</p>
        <h1>No such piece</h1>
        <p className="lede">
          Nothing is registered at <code>{slug}</code>. See the <Link to="/work">catalog</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="page work">
      <p className="eyebrow">
        {work.kicker} · {work.year}
      </p>
      <h1>{work.title}</h1>
      <p className="lede tight">{work.summary}</p>
      {work.live !== undefined ? <Live kind={work.live} /> : null}
      {work.body.map((para) => (
        <p key={para} className="prose">
          {para}
        </p>
      ))}
      {work.assumptions !== undefined ? (
        <aside className="assumptions">
          <h3>Assumptions</h3>
          <ul>
            {work.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </aside>
      ) : null}
      {work.links !== undefined && work.links.length > 0 ? (
        <p className="links">
          {work.links.map((link) =>
            // SPA routes (/phd, /work/...) go through the router; embedded
            // apps (/defense/, /studio/, ...) end with a slash and need a
            // real page load.
            link.href.startsWith('/') && !link.href.endsWith('/') ? (
              <Link key={link.href} to={link.href}>
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                {...(link.href.startsWith('/') ? {} : { target: '_blank', rel: 'noreferrer' })}
              >
                {link.label}
              </a>
            ),
          )}
        </p>
      ) : null}
    </div>
  );
}
