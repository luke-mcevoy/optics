import { lazy, Suspense, useEffect, useState } from 'react';
import { CHAPTERS } from './chapters/pages.tsx';
import { FOUNDATIONS } from './foundations/registry.tsx';

const FoundationsIndex = lazy(() =>
  import('./foundations/FoundationsPage.tsx').then((m) => ({ default: m.FoundationsIndex })),
);
const FoundationPage = lazy(() =>
  import('./foundations/FoundationsPage.tsx').then((m) => ({ default: m.FoundationPage })),
);

type Route = { kind: 'guide' } | { kind: 'foundations'; slug: string | undefined; section: string | undefined };

/** `#/foundations/<slug>/<section>` routes to a foundations page; any other hash is the guide. */
function parseRoute(hash: string): Route {
  if (!hash.startsWith('#/')) return { kind: 'guide' };
  const parts = hash.slice(2).split('/').filter((p) => p.length > 0);
  if (parts[0] !== 'foundations') return { kind: 'guide' };
  return { kind: 'foundations', slug: parts[1], section: parts[2] };
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function App() {
  const route = useHashRoute();
  if (route.kind === 'foundations') {
    return (
      <Suspense fallback={<div className="page route-loading" aria-busy="true" />}>
        {route.slug === undefined ? <FoundationsIndex /> : <FoundationPage slug={route.slug} section={route.section} />}
      </Suspense>
    );
  }
  return <Guide />;
}

function Guide() {
  const [active, setActive] = useState(CHAPTERS[0]?.id ?? 'thesis');

  useEffect(() => {
    const nodes = CHAPTERS.map((ch) => document.getElementById(ch.id)).filter(
      (n): n is HTMLElement => n !== null,
    );
    if (nodes.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '0px 0px -55% 0px', threshold: [0.1, 0.25, 0.5] },
    );
    for (const node of nodes) io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.title = 'How to build a quantum computer out of atoms';
    const id = window.location.hash.replace(/^#\/?/, '');
    if (id.length > 0 && !id.includes('/')) {
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target;
      if (el instanceof HTMLElement) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return;
      }
      const i = CHAPTERS.findIndex((ch) => ch.id === active);
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = CHAPTERS[Math.min(CHAPTERS.length - 1, Math.max(0, i) + 1)];
        if (next) document.getElementById(next.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const prev = CHAPTERS[Math.max(0, i - 1)];
        if (prev) document.getElementById(prev.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <div className="page">
      <header className="masthead">
        <p className="site-name">
          Neutral-atom quantum computing<span>a guide for absolutely everyone</span>
        </p>
        <p className="mast-meta">
          <a href="#/foundations">foundations</a> ·{' '}
          <a href="https://doi.org/10.1038/s41586-025-09848-5">the paper ↗</a>
        </p>
      </header>

      <header className="hero">
        <div className="hero-inner">
          <h1>How to build a quantum computer out of atoms</h1>
          <p className="based-on">
            Based on: Bluvstein, D., Geim, A.A., Li, S.H. et al. A fault-tolerant neutral-atom
            architecture for universal quantum computation. <em>Nature</em> <strong>649</strong>,
            39–46 (2026), published online 10 November 2025 ·{' '}
            <a href="https://doi.org/10.1038/s41586-025-09848-5">doi:10.1038/s41586-025-09848-5</a>{' '}
            · Harvard, MIT and collaborators (Lukin group)
          </p>

          <aside className="provenance" role="note">
            <p className="provenance-kicker">Public paper only · No insider information</p>
            <p>
              This page is an unofficial explainer of a published article. Every number,
              claim, and figure is taken from Bluvstein, Geim et al., <em>Nature</em>{' '}
              <strong>649</strong>, 39–46 (2026) (
              <a href="https://doi.org/10.1038/s41586-025-09848-5">
                doi:10.1038/s41586-025-09848-5
              </a>
              ) or computed from a formula stated there. There is no insider information:
              nothing unpublished, nothing from private communication with the authors, and
              no laboratory access beyond the paper and its public supplement.
            </p>
          </aside>
        </div>
      </header>

      <div className="sheet">
        <nav className="toc" aria-label="Contents">
          <p className="toc-label">Contents</p>
          {CHAPTERS.map((ch) => (
            <a
              key={ch.id}
              href={`#${ch.id}`}
              className={active === ch.id ? 'active' : undefined}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(ch.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="toc-num">{ch.num}</span>
              {ch.title}
            </a>
          ))}
          <p className="toc-label toc-label-gap">Foundations</p>
          {FOUNDATIONS.filter((f) => f.status === 'live').map((f) => (
            <a key={f.slug} href={`#/foundations/${f.slug}`}>
              <span className="toc-num">→</span>
              {f.title}
            </a>
          ))}
          <a href="#/foundations">
            <span className="toc-num">≡</span>all foundations
          </a>
        </nav>

        <article className="article">
          <section className="abstract">
            <h2>How to read this guide</h2>
            <p>
              This is a plain-English walkthrough of a real machine: a computer whose bits are
              single atoms, whose wires are moving laser tweezers, and whose logic gates are
              flashes of light. Every chapter is written in three layers.{' '}
              <strong>Level 1</strong> boxes use everyday language and assume no science
              background — read only those, top to bottom, and you will understand the whole
              machine. <strong>Level 2</strong> explains the physics for the curious.{' '}
              <strong>Level 3</strong> reports exactly what the paper measured, with its numbers.
              The figures are interactive — drag the sliders, click the step buttons — and every
              number on this page comes from the published paper. Where the guide leans on a
              piece of physics it does not derive — hyperfine structure, light shifts, Rydberg
              atoms — dotted links lead to the{' '}
              <a href="#/foundations">Foundations</a> pages, which build those concepts from
              first principles with the same kind of live figures.
            </p>
          </section>

          {CHAPTERS.map((ch) => (
            <section key={ch.id} id={ch.id} className="sec">
              <h2>
                <span>Chapter {ch.num}</span>
                {ch.title}
              </h2>
              <p className="standfirst">{ch.kicker}</p>
              {ch.body}
            </section>
          ))}

          <footer className="article-foot">
            <p>
              Unofficial interactive explainer of Bluvstein, Geim et al. <em>Nature</em>{' '}
              <strong>649</strong>, 39–46 (2026),{' '}
              <a href="https://doi.org/10.1038/s41586-025-09848-5">doi:10.1038/s41586-025-09848-5</a>.
              Not affiliated with the authors or the journal.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
