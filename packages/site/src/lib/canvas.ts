export function sizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('2d context unavailable');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number, fill = '#0c1014'): void {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
}
