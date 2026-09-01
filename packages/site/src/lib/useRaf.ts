import { useEffect, useRef } from 'react';

export function useRaf(draw: (t: number) => void, active = true): void {
  const fn = useRef(draw);
  fn.current = draw;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const tick = (t: number) => {
      fn.current(t);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);
}
