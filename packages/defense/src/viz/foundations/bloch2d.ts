import type { Vec3 } from '../../physics/qubit.ts';

export const MONO = '11px IBM Plex Mono, monospace';
export const SANS = '12px Source Sans 3, sans-serif';
export const CREAM = '#e8e4dc';
export const MUTED = '#8b8680';
export const BLUE = '#6ea8d4';
export const AMBER = '#d4a24a';
export const VIOLET = '#b08ad6';
export const GREEN = '#7fbf7f';
export const RED = '#c81e1e';

const YAW = -0.55;
const PITCH = 0.32;

/** Orthographic projection of a Bloch vector; returns screen offset (x right, y up) and depth. */
export function project(v: Vec3): { x: number; y: number; depth: number } {
  const x1 = v[0] * Math.cos(YAW) - v[1] * Math.sin(YAW);
  const y1 = v[0] * Math.sin(YAW) + v[1] * Math.cos(YAW);
  const z1 = v[2];
  return {
    x: x1,
    y: z1 * Math.cos(PITCH) - y1 * Math.sin(PITCH),
    depth: y1 * Math.cos(PITCH) + z1 * Math.sin(PITCH),
  };
}

/** Screen position of a Bloch vector on a sphere drawn at (cx, cy) with radius R. */
export function toScreen(v: Vec3, cx: number, cy: number, R: number): [number, number] {
  const p = project(v);
  return [cx + R * p.x, cy - R * p.y];
}

export function drawSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  opts: { labels?: boolean; axes?: boolean } = {},
): void {
  ctx.strokeStyle = '#2a2b2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.stroke();
  // equator
  ctx.beginPath();
  for (let i = 0; i <= 96; i += 1) {
    const a = (i / 96) * 2 * Math.PI;
    const p = project([Math.cos(a), Math.sin(a), 0]);
    const sx = cx + R * p.x;
    const sy = cy - R * p.y;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  if (opts.axes !== false) {
    for (const [v, label] of [
      [[1, 0, 0], 'x'],
      [[0, 1, 0], 'y'],
      [[0, 0, 1], ''],
    ] as const) {
      const p = project(v as Vec3);
      ctx.strokeStyle = '#3a3c40';
      ctx.beginPath();
      ctx.moveTo(cx - R * p.x, cy + R * p.y);
      ctx.lineTo(cx + R * p.x, cy - R * p.y);
      ctx.stroke();
      if (label) {
        ctx.fillStyle = MUTED;
        ctx.font = MONO;
        ctx.fillText(label, cx + R * p.x * 1.12 - 3, cy - R * p.y * 1.12 + 4);
      }
    }
  }
  if (opts.labels !== false) {
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText('|0⟩', cx + 6, cy - R - 4);
    ctx.fillText('|1⟩', cx + 6, cy + R + 14);
  }
}

export function drawVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  v: Vec3,
  color: string,
  width = 2,
  head = 4.5,
): void {
  const p = project(v);
  const sx = cx + R * p.x;
  const sy = cy - R * p.y;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = p.depth < -0.2 ? 0.55 : 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, head, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  pts: readonly Vec3[],
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  pts.forEach((v, i) => {
    const p = project(v);
    const sx = cx + R * p.x;
    const sy = cy - R * p.y;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
}

/** Simple framed plot helper. */
export function frame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title?: string,
): void {
  ctx.strokeStyle = '#26282c';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  if (title !== undefined) {
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText(title, x + 6, y + 14);
  }
}

export function bars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  values: readonly { label: string; frac: number; color: string; note?: string }[],
): void {
  const n = values.length;
  const bw = (w - (n - 1) * 10) / n;
  values.forEach((v, i) => {
    const bx = x + i * (bw + 10);
    ctx.fillStyle = '#1b1c1f';
    ctx.fillRect(bx, y, bw, h);
    ctx.fillStyle = v.color;
    const bh = Math.max(0, Math.min(1, v.frac)) * h;
    ctx.fillRect(bx, y + h - bh, bw, bh);
    ctx.fillStyle = CREAM;
    ctx.font = MONO;
    ctx.textAlign = 'center';
    ctx.fillText(v.label, bx + bw / 2, y + h + 14);
    if (v.note !== undefined) {
      ctx.fillStyle = MUTED;
      ctx.fillText(v.note, bx + bw / 2, y - 6);
    }
    ctx.textAlign = 'left';
  });
}

/** Deterministic LCG uniform generator. */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
