import { Link } from '../components/Link.tsx';
import { WORKS } from '../data/works.ts';

export function Works() {
  return (
    <div className="page works">
      <p className="eyebrow">Catalog</p>
      <h1>Work</h1>
      <p className="lede tight">
        Live boards run here. Instruments and papers are listed until they can be
        hosted in place. Add a visualization by appending <code>data/works.ts</code>.
      </p>
      <ul className="work-list">
        {WORKS.map((work) => (
          <li key={work.slug}>
            <Link to={work.page ?? `/work/${work.slug}`} className="work-row">
              <span className="work-kicker">
                {work.kicker}
                <span>{work.year}</span>
              </span>
              <span className="work-title">{work.title}</span>
              <span className="work-sum">{work.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
