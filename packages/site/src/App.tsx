import { useEffect, useState } from 'react';
import { Nav } from './components/Nav.tsx';
import { CONTACT } from './data/cv.ts';
import { parsePath, type Route } from './lib/router.ts';
import { About } from './pages/About.tsx';
import { Home } from './pages/Home.tsx';
import { Thesis } from './pages/Thesis.tsx';
import { Work } from './pages/Work.tsx';
import { Works } from './pages/Works.tsx';

function readRoute(): Route {
  return parsePath(window.location.pathname);
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onPop = (): void => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (route.name === 'home') document.title = 'Luke McEvoy';
    else if (route.name === 'works') document.title = 'Work — Luke McEvoy';
    else if (route.name === 'thesis') document.title = 'PhD — Luke McEvoy';
    else if (route.name === 'about') document.title = 'About — Luke McEvoy';
    else document.title = `${route.slug} — Luke McEvoy`;
  }, [route]);

  return (
    <div className="shell">
      <Nav route={route} />
      <main>
        {route.name === 'home' ? <Home /> : null}
        {route.name === 'works' ? <Works /> : null}
        {route.name === 'work' ? <Work slug={route.slug} /> : null}
        {route.name === 'thesis' ? <Thesis /> : null}
        {route.name === 'about' ? <About /> : null}
      </main>
      <footer className="foot">
        <span>Luke McEvoy · New York, NY</span>
        <span className="foot-links">
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          <a href={CONTACT.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={CONTACT.resumePdf} target="_blank" rel="noreferrer">
            Resume
          </a>
        </span>
      </footer>
    </div>
  );
}
