export type Route =
  | { name: 'home' }
  | { name: 'works' }
  | { name: 'work'; slug: string }
  | { name: 'thesis' }
  | { name: 'about' };

export function parsePath(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return { name: 'home' };
  if (clean === '/work') return { name: 'works' };
  if (clean === '/phd') return { name: 'thesis' };
  if (clean === '/about') return { name: 'about' };
  const work = /^\/work\/([^/]+)$/.exec(clean);
  if (work?.[1] !== undefined) return { name: 'work', slug: decodeURIComponent(work[1]) };
  return { name: 'home' };
}

export function hrefOf(route: Route): string {
  if (route.name === 'home') return '/';
  if (route.name === 'works') return '/work';
  if (route.name === 'thesis') return '/phd';
  if (route.name === 'about') return '/about';
  return `/work/${encodeURIComponent(route.slug)}`;
}
