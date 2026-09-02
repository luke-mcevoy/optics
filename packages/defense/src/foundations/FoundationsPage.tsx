import { useEffect } from 'react';
import { findFoundation, FOUNDATIONS } from './registry.tsx';

function Masthead() {
  return (
    <header className="masthead">
      <p className="site-name">
        <a href="#/">Neutral-atom quantum computing</a>
        <span>foundations — the physics the guide assumes</span>
      </p>
      <p className="mast-meta">
        <a href="#/">the guide</a> · <a href="#/foundations">all foundations</a>
      </p>
    </header>
  );
}

export function FoundationsIndex() {
  useEffect(() => {
    document.title = 'Foundations — neutral-atom quantum computing';
    window.scrollTo(0, 0);
  }, []);
  const live = FOUNDATIONS.filter((f) => f.status === 'live');
  const planned = FOUNDATIONS.filter((f) => f.status === 'planned');
  return (
    <div className="page">
      <Masthead />
      <header className="hero hero-foundations">
        <div className="hero-inner">
          <p className="crumb">Foundations</p>
          <h1>The physics the guide takes for granted</h1>
          <p className="based-on">
            The main guide explains a machine. It is not the place to derive what hyperfine
            structure is, why light can hold an atom, or how a parity check avoids collapsing a
            superposition — but without those, the machine is a list of words. Each page here
            builds one such concept from first principles, in the same three levels and with the
            same live, computed figures. Nothing here is from the paper; it is standard atomic
            and quantum physics, with sources stated.
          </p>
        </div>
      </header>
      <div className="sheet sheet-single">
        <article className="article">
          <section className="sec">
            <h2>
              <span>Available now</span>
              Start here
            </h2>
            <div className="fcards">
              {live.map((f) => (
                <a key={f.slug} className="fcard" href={`#/foundations/${f.slug}`}>
                  <p className="fcard-title">{f.title}</p>
                  <p className="fcard-kicker">{f.kicker}</p>
                  <p className="fcard-summary">{f.summary}</p>
                  <p className="fcard-meta">{f.sections.length} sections · read →</p>
                </a>
              ))}
            </div>
          </section>
          <section className="sec">
            <h2>
              <span>In preparation</span>
              The rest of the map
            </h2>
            <p className="standfirst">In dependency order; each names what it assumes.</p>
            <div className="fcards">
              {planned.map((f) => (
                <div key={f.slug} className="fcard fcard-planned">
                  <p className="fcard-title">{f.title}</p>
                  <p className="fcard-kicker">{f.kicker}</p>
                  <p className="fcard-summary">{f.summary}</p>
                  <p className="fcard-meta">
                    {f.needs.length > 0
                      ? `assumes: ${f.needs.map((n) => findFoundation(n)?.title ?? n).join(', ')}`
                      : 'assumes nothing'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

export function FoundationPage({ slug, section }: { slug: string; section: string | undefined }) {
  const page = findFoundation(slug);
  useEffect(() => {
    if (page === undefined) return;
    document.title = `${page.title} — foundations`;
    if (section !== undefined) {
      // Wait a frame for lazy boards to reserve their space.
      requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [page, section]);

  if (page === undefined || page.status !== 'live') {
    return (
      <div className="page">
        <Masthead />
        <header className="hero hero-foundations">
          <div className="hero-inner">
            <p className="crumb">Foundations</p>
            <h1>{page?.title ?? 'Not found'}</h1>
            <p className="based-on">
              {page !== undefined ? 'This page is in preparation.' : 'There is no foundations page at this address.'}{' '}
              <a href="#/foundations">See what is available.</a>
            </p>
          </div>
        </header>
      </div>
    );
  }

  const idx = FOUNDATIONS.filter((f) => f.status === 'live').findIndex((f) => f.slug === slug);

  return (
    <div className="page">
      <Masthead />
      <header className="hero hero-foundations">
        <div className="hero-inner">
          <p className="crumb">
            <a href="#/foundations">Foundations</a> · {String(idx + 1).padStart(2, '0')}
          </p>
          <h1>{page.title}</h1>
          <p className="based-on">{page.kicker}.</p>
        </div>
      </header>
      <div className="sheet">
        <nav className="toc" aria-label="Sections">
          <p className="toc-label">Sections</p>
          {page.sections.map((s, i) => (
            <a
              key={s.id}
              href={`#/foundations/${slug}/${s.id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
              {s.title}
            </a>
          ))}
          <p className="toc-label toc-label-gap">Elsewhere</p>
          <a href="#/">
            <span className="toc-num">←</span>the guide
          </a>
          <a href="#/foundations">
            <span className="toc-num">≡</span>all foundations
          </a>
        </nav>
        <article className="article">
          {page.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="sec">
              <h2>
                <span>Section {String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              <p className="standfirst">{s.kicker}</p>
              {s.body}
            </section>
          ))}
          <footer className="article-foot">
            <p>
              Foundations pages contain standard physics, not results from the paper; sources are
              listed in each page&rsquo;s closing note. <a href="#/">Back to the guide.</a>
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
