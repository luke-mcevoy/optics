import type { ReactNode } from 'react';

export function Claim({
  value,
  unit,
  source,
  note,
}: {
  value: ReactNode;
  unit?: string;
  source: string;
  note?: string;
}) {
  return (
    <div className="claim">
      <div className="claim-value">
        {value}
        {unit !== undefined ? <span className="claim-unit">{unit}</span> : null}
      </div>
      <div className="claim-meta">
        <span className="claim-src">{source}</span>
        {note !== undefined ? <span className="claim-note">{note}</span> : null}
      </div>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <aside className="note">{children}</aside>;
}

export function Assumption({ children }: { children: ReactNode }) {
  return <p className="assumption">{children}</p>;
}
