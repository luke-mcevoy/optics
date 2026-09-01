import type { MouseEvent, ReactNode } from 'react';

export function Link({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string | undefined;
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (window.location.pathname === to) return;
    history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
