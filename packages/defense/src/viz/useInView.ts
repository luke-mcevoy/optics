import { type RefObject, useEffect, useState } from 'react';

/**
 * True while `ref`'s element intersects the viewport expanded by `rootMargin`.
 * Returns `true` when no ref is supplied or IntersectionObserver is unavailable, so
 * callers degrade to always-on rather than never-on.
 */
export function useInView(ref: RefObject<Element | null> | undefined, rootMargin = '0px'): boolean {
  const [inView, setInView] = useState(ref === undefined);
  useEffect(() => {
    const el = ref?.current;
    if (el === undefined || el === null) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setInView(e.isIntersecting);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
