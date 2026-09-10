import { lazy, Suspense, useEffect, useState } from 'react';

const FoundationsIndex = lazy(() =>
  import('./foundations/FoundationsPage.tsx').then((m) => ({ default: m.FoundationsIndex })),
);
const FoundationPage = lazy(() =>
  import('./foundations/FoundationsPage.tsx').then((m) => ({ default: m.FoundationPage })),
);
const Guide = lazy(() => import('./Guide.tsx'));
const QuantumJourney = lazy(() => import('./journey/QuantumJourney.tsx'));
const PaperJourney = lazy(() => import('./journey/PaperJourney.tsx'));
const InstrumentLab = lazy(() => import('./viz/Instrument3D.tsx').then(m => ({ default: m.InstrumentLab })));

type Route = { kind: 'instrument' } | { kind: 'journey' } | { kind: 'basics' } | { kind: 'guide' } | { kind: 'foundations'; slug: string | undefined; section: string | undefined };

/** The original paper guide is the entrance; focused views are optional. */
function parseRoute(hash: string): Route {
  if (hash.startsWith('#/instrument')) return { kind: 'instrument' };
  if (hash.startsWith('#/journey')) return { kind: 'journey' };
  if (hash.startsWith('#/basics')) return { kind: 'basics' };
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
  if (route.kind === 'instrument') return <Suspense fallback={<div className="route-loading" aria-label="Loading the instrument" aria-busy="true" />}><InstrumentLab /></Suspense>;
  if (route.kind === 'journey' || route.kind === 'basics') return <Suspense fallback={<div className="route-loading" aria-label="Loading the quantum journey" aria-busy="true" />}>{route.kind === 'journey' ? <PaperJourney /> : <QuantumJourney />}</Suspense>;
  if (route.kind === 'foundations') {
    return (
      <Suspense fallback={<div className="page route-loading" aria-busy="true" />}>
        {route.slug === undefined ? <FoundationsIndex /> : <FoundationPage slug={route.slug} section={route.section} />}
      </Suspense>
    );
  }
  return <Suspense fallback={<div className="page route-loading" aria-busy="true" />}><Guide /></Suspense>;
}
