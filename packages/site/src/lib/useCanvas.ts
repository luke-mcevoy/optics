import { useEffect, useRef, type RefObject } from 'react';
import { sizeCanvas } from './canvas.ts';
import { useRaf } from './useRaf.ts';

export function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
): { wrap: RefObject<HTMLDivElement | null>; canvas: RefObject<HTMLCanvasElement | null> } {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const el = wrap.current;
    const node = canvas.current;
    if (el === null || node === null) return;
    const apply = (): void => {
      const r = el.getBoundingClientRect();
      size.current = { w: Math.max(1, r.width), h: Math.max(1, r.height) };
      sizeCanvas(node, size.current.w, size.current.h);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useRaf((t) => {
    const node = canvas.current;
    if (node === null || size.current.w === 0) return;
    const ctx = node.getContext('2d');
    if (ctx === null) return;
    drawRef.current(ctx, size.current.w, size.current.h, t);
  });

  return { wrap, canvas };
}
