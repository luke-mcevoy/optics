import { Link } from '../components/Link.tsx';
import { featuredWorks, WORKS } from '../data/works.ts';

export function Home() {
  const featured = featuredWorks();
  return (
    <div className="page home">
      <section className="hero">
        <p className="eyebrow">Laboratory</p>
        <h1>
          Simulations you
          <br />
          can interrogate.
        </h1>
        <p className="lede">
          Luke McEvoy — PhD in physics from Stevens Institute of Technology, inventor of the
          Physics-Informed Masked Autoencoder for single-photon LiDAR. Core team on QuEra&rsquo;s
          MHS laser-stabilization pilot with Anthropic. Previously Tesla Autopilot, Quantum
          Computing Inc., and ASML.
        </p>
      </section>

      <section className="featured">
        <header className="section-head">
          <h2>On the bench</h2>
          <Link to="/work">All work</Link>
        </header>
        <ol className="feature-list">
          {featured.map((work) => (
            <li key={work.slug}>
              <Link to={work.page ?? `/work/${work.slug}`} className="feature-row">
                <span className="feature-meta">
                  <span>{work.kicker}</span>
                  <span>{work.year}</span>
                </span>
                <span className="feature-title">{work.title}</span>
                <span className="feature-sum">{work.summary}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="index">
        <header className="section-head">
          <h2>Index</h2>
        </header>
        <table className="index-table">
          <tbody>
            {WORKS.map((work) => (
              <tr key={work.slug}>
                <td className="idx-year">{work.year}</td>
                <td>
                  <Link to={work.page ?? `/work/${work.slug}`}>{work.title}</Link>
                </td>
                <td className="idx-status">{work.status}</td>
                <td className="idx-tags">{work.tags.slice(0, 2).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
