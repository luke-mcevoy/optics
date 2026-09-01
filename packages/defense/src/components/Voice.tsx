import type { ReactNode } from 'react';

/** Level 1: everyday language, no science background assumed. */
export function Plain({ children }: { children: ReactNode }) {
  return (
    <section className="voice plain-voice">
      <p className="voice-label">Level 1 | Plain English — start here</p>
      {children}
    </section>
  );
}

/** Level 2: the physics, for readers who want the mechanism. */
export function Primer({ children }: { children: ReactNode }) {
  return (
    <section className="voice primer">
      <p className="voice-label">Level 2 | The physics</p>
      {children}
    </section>
  );
}

/** Level 3: exactly what the paper measured, with its numbers. */
export function Defense({ children }: { children: ReactNode }) {
  return (
    <section className="voice defense-voice">
      <p className="voice-label">Level 3 | What the paper measured</p>
      {children}
    </section>
  );
}
