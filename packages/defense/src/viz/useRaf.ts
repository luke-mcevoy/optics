import { type RefObject, useEffect, useRef } from 'react';
import { useInView } from './useInView.ts';

/**
 * requestAnimationFrame loop. When `watch` is given the loop only runs while that element
 * is within ~one viewport of the screen, so off-screen boards cost nothing.
 */
export function useRaf(draw: (t: number) => void, active = true, watch?: RefObject<Element | null>): void {
  const fn = useRef(draw);
  fn.current = draw;
  const inView = useInView(watch, '200px');
  const run = active && inView;
  useEffect(() => {
    if (!run) return;
    let id = 0;
    const tick = (t: number) => {
      fn.current(t);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [run]);
}
