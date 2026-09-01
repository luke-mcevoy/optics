import type { ReactNode } from 'react';

export type KeyItem = { color: string; label: string };

export function LookingAt({
  title,
  items,
  note,
}: {
  title: string;
  items: readonly KeyItem[];
  note?: ReactNode;
}) {
  return (
    <div className="looking-at">
      <p className="looking-at-kicker">You are looking at</p>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <span className="swatch" style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
      {note !== undefined ? <p className="looking-at-note">{note}</p> : null}
    </div>
  );
}
