/**
 * Live sketch of the thesis pipeline: a synthetic depth scene, a physical
 * scan mask (random / Lissajous / spiral, Ch. 4–5), and biharmonic
 * inpainting (Ch. 5: solve Δ²u = 0 on the missing set with measured pixels
 * as Dirichlet data). Solved here by Gauss–Seidel sweeps of the 13-point
 * stencil so convergence is visible; replicate padding at the image edge.
 */

export const GRID = 48;

export type MaskPattern = 'random' | 'lissajous' | 'spiral';

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic depth scene in [0, 1]: tilted floor, sphere, step bar. */
export function makeScene(): Float64Array {
  const u = new Float64Array(GRID * GRID);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      let d = 0.16 + 0.16 * (y / GRID) + 0.05 * (x / GRID);
      const dx = x - GRID * 0.36;
      const dy = y - GRID * 0.42;
      const r2 = dx * dx + dy * dy;
      const R = GRID * 0.21;
      if (r2 < R * R) d = 0.55 + 0.38 * Math.sqrt(1 - r2 / (R * R));
      const bx = x - GRID * 0.74;
      if (Math.abs(bx) < GRID * 0.07 && y > GRID * 0.18 && y < GRID * 0.86) d = 0.62;
      if (y > GRID * 0.62 && x > GRID * 0.56 && x < GRID * 0.7 && y < GRID * 0.76) d = 0.45;
      u[y * GRID + x] = d;
    }
  }
  return u;
}

/** Binary keep mask: 1 = physically scanned. May keep fewer pixels than the
 *  budget for structured scans that saturate — report the actual count. */
export function makeMask(pattern: MaskPattern, maskPct: number, seed: number): Uint8Array {
  const mask = new Uint8Array(GRID * GRID);
  const budget = Math.max(8, Math.round(GRID * GRID * (1 - maskPct / 100)));
  const rand = mulberry(seed);

  if (pattern === 'random') {
    const idx = Array.from({ length: GRID * GRID }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      const a = idx[i] ?? 0;
      idx[i] = idx[j] ?? 0;
      idx[j] = a;
    }
    for (let k = 0; k < budget; k += 1) mask[idx[k] ?? 0] = 1;
    return mask;
  }

  let kept = 0;
  const steps = 60000;
  for (let s = 0; s < steps && kept < budget; s += 1) {
    const t = s / steps;
    let x = 0;
    let y = 0;
    if (pattern === 'lissajous') {
      // Slowly precessing Lissajous so the scan gradually covers the grid.
      const a = 2 * Math.PI * (5 * t * 40);
      const b = 2 * Math.PI * (4 * t * 40 + 0.13 * t * 40 * t);
      x = ((Math.sin(a) + 1) / 2) * (GRID - 1);
      y = ((Math.sin(b + Math.PI / 2) + 1) / 2) * (GRID - 1);
    } else {
      const turns = 14;
      const r = (t * (GRID - 2)) / 2;
      const th = 2 * Math.PI * turns * t;
      x = GRID / 2 + r * Math.cos(th);
      y = GRID / 2 + r * Math.sin(th);
    }
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= GRID || yi >= GRID) continue;
    const i = yi * GRID + xi;
    if (mask[i] === 0) {
      mask[i] = 1;
      kept += 1;
    }
  }
  return mask;
}

export interface Solver {
  readonly u: Float64Array;
  sweep(n: number): void;
  psnr(): number;
  converged(): boolean;
}

export function createSolver(scene: Float64Array, mask: Uint8Array): Solver {
  const n = GRID;
  const u = new Float64Array(n * n);
  const at = (x: number, y: number): number => {
    const xi = Math.min(n - 1, Math.max(0, x));
    const yi = Math.min(n - 1, Math.max(0, y));
    return u[yi * n + xi] ?? 0;
  };

  // Initialize measured pixels; seed unknowns with the measured mean.
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n * n; i += 1) {
    if (mask[i] === 1) {
      u[i] = scene[i] ?? 0;
      sum += scene[i] ?? 0;
      count += 1;
    }
  }
  const mean = count > 0 ? sum / count : 0.5;
  for (let i = 0; i < n * n; i += 1) if (mask[i] === 0) u[i] = mean;

  // Warm start: harmonic (Laplace) relaxation before the biharmonic solve.
  for (let pass = 0; pass < 80; pass += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const i = y * n + x;
        if (mask[i] === 1) continue;
        u[i] = (at(x + 1, y) + at(x - 1, y) + at(x, y + 1) + at(x, y - 1)) / 4;
      }
    }
  }

  let lastDelta = Infinity;

  const sweep = (passes: number): void => {
    for (let pass = 0; pass < passes; pass += 1) {
      let delta = 0;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const i = y * n + x;
          if (mask[i] === 1) continue;
          const edge = at(x + 1, y) + at(x - 1, y) + at(x, y + 1) + at(x, y - 1);
          const diag = at(x + 1, y + 1) + at(x - 1, y + 1) + at(x + 1, y - 1) + at(x - 1, y - 1);
          const far = at(x + 2, y) + at(x - 2, y) + at(x, y + 2) + at(x, y - 2);
          const next = (8 * edge - 2 * diag - far) / 20;
          delta = Math.max(delta, Math.abs(next - (u[i] ?? 0)));
          u[i] = next;
        }
      }
      lastDelta = delta;
    }
  };

  const psnr = (): number => {
    let mse = 0;
    for (let i = 0; i < n * n; i += 1) {
      const d = (u[i] ?? 0) - (scene[i] ?? 0);
      mse += d * d;
    }
    mse /= n * n;
    if (mse <= 0) return Infinity;
    return 10 * Math.log10(1 / mse);
  };

  return { u, sweep, psnr, converged: () => lastDelta < 1e-7 };
}

/** Depth-to-color for drawing (site palette; dark → amber → cream). */
export function depthColor(v: number): string {
  const t = Math.min(1, Math.max(0, v));
  const r = Math.round(18 + t * (243 - 18));
  const g = Math.round(22 + t * (200 - 22));
  const b = Math.round(30 + t * (110 - 30));
  return `rgb(${r}, ${g}, ${b})`;
}
