import type { ReactNode } from 'react';

/**
 * Inline link from the guide to a Foundations page (optionally a section of it).
 * `to` is "slug" or "slug/section"; `tip` is the one-line definition shown on hover.
 */
export function Term({ to, tip, children }: { to: string; tip: string; children: ReactNode }) {
  return (
    <a className="term" href={`#/foundations/${to}`} title={tip}>
      {children}
    </a>
  );
}
