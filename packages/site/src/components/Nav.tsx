import { Link } from './Link.tsx';
import type { Route } from '../lib/router.ts';

const DATELINE = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export function Nav({ route }: { route: Route }) {
  const onWork = route.name === 'works' || route.name === 'work';
  return (
    <header className="masthead">
      <div className="dateline">
        <span>New York, N.Y.</span>
        <span className="dateline-motto">Every number computed live in your browser</span>
        <span>{DATELINE}</span>
      </div>
      <Link to="/" className="mast-title">
        Luke McEvoy
      </Link>
      <nav className="mast-sections">
        <Link to="/phd" className={route.name === 'thesis' ? 'on' : undefined}>
          The PhD
        </Link>
        <Link to="/work" className={onWork ? 'on' : undefined}>
          Work
        </Link>
        <Link to="/about" className={route.name === 'about' ? 'on' : undefined}>
          About
        </Link>
      </nav>
    </header>
  );
}
