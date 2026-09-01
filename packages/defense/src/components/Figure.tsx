import type { ReactNode } from 'react';

export function Figure({
  n,
  title,
  caption,
  children,
}: {
  n: string;
  title: string;
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="nfig">
      <div className="nfig-grid">{children}</div>
      <figcaption>
        <strong>
          Fig. {n} | {title}.
        </strong>{' '}
        {caption}
      </figcaption>
    </figure>
  );
}

export function Panel({
  tag,
  title,
  children,
  wide,
  dim,
}: {
  tag: string;
  title?: string;
  children: ReactNode;
  wide?: boolean;
  dim?: boolean;
}) {
  const classes = ['npanel'];
  if (wide === true) classes.push('npanel-wide');
  if (dim === true) classes.push('npanel-dim');
  return (
    <div className={classes.join(' ')}>
      <span className="npanel-tag">{tag}</span>
      {title !== undefined ? <p className="npanel-title">{title}</p> : null}
      {children}
    </div>
  );
}
