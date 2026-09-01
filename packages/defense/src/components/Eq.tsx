import type { ReactNode } from 'react';

export function Eq({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <figure className="eq">
      <div className="eq-body">{children}</div>
      {label !== undefined ? <figcaption>{label}</figcaption> : null}
    </figure>
  );
}

export function Sym({ children }: { children: ReactNode }) {
  return <span className="sym">{children}</span>;
}
