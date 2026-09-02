/**
 * Alkali valence-electron |ψ_nlm|² sampling.
 *
 * Radial *shape* is hydrogenic (node count from the integer n), but the radial *scale* uses
 * the Rb quantum defect: n* = n − δ_ℓ. For the loosely bound Rydberg electron this is the
 * standard, accurate description; for the 5s ground state it gives ⟨r⟩ ≈ 5 a₀ rather than the
 * hydrogenic 37 a₀, which matters when the two are drawn at one scale.
 * Distances in Bohr radii unless noted.
 */

const A0_NM = 0.0529177;

/** Rb quantum defects (n → ∞ limit), Li et al. 2003 / Mack et al. 2011. */
const QUANTUM_DEFECT: readonly number[] = [3.131, 2.648, 1.348, 0.016];

export function effectiveN(n: number, l: number): number {
  const delta = QUANTUM_DEFECT[l] ?? 0;
  return Math.max(l + 1, n - delta);
}

export function meanRadiusA0(n: number, l: number): number {
  const ns = effectiveN(n, l);
  return 0.5 * (3 * ns * ns - l * (l + 1));
}

export function meanRadiusNm(n: number, l: number): number {
  return meanRadiusA0(n, l) * A0_NM;
}

function factorial(n: number): number {
  let x = 1;
  for (let i = 2; i <= n; i += 1) x *= i;
  return x;
}

function laguerre(k: number, alpha: number, x: number): number {
  if (k === 0) return 1;
  if (k === 1) return 1 + alpha - x;
  let prev2 = 1;
  let prev1 = 1 + alpha - x;
  for (let i = 1; i < k; i += 1) {
    const next = ((2 * i + 1 + alpha - x) * prev1 - (i + alpha) * prev2) / (i + 1);
    prev2 = prev1;
    prev1 = next;
  }
  return prev1;
}

/** Outer edge of the radial grid for state (n, ℓ), in a0. */
export function rMaxA0(n: number, l: number): number {
  const ns = effectiveN(n, l);
  return 3.2 * ns * ns;
}

/**
 * Radial R_nl(r) in a0 units. Nodal structure uses the integer n (clamped to 12 so the
 * Laguerre recursion stays well conditioned); the radius is then scaled to (n*)².
 */
export function radialR(nPhys: number, l: number, r: number): number {
  const nStruct = Math.min(Math.max(l + 1, Math.round(nPhys > 12 ? 12 : nPhys)), 12);
  const ns = effectiveN(nPhys, l);
  const scale = (ns * ns) / (nStruct * nStruct);
  const rEff = r / scale;
  const rho = (2 * rEff) / nStruct;
  const pref = Math.sqrt(
    (2 / nStruct) ** 3 * (factorial(nStruct - l - 1) / (2 * nStruct * factorial(nStruct + l))),
  );
  // scale^(-3/2) keeps ∫ r² R² dr = 1 after stretching the radius to (n*)².
  return (
    pref * scale ** -1.5 * Math.exp(-rho / 2) * rho ** l * laguerre(nStruct - l - 1, 2 * l + 1, rho)
  );
}

function sampleMu(l: number, m: number, u: number): number {
  if (l === 0 || m !== 0) return 2 * u - 1;
  return Math.cbrt(2 * u - 1);
}

const cache = new Map<string, Float32Array>();

export function sampleOrbital(opts: {
  n: number;
  l: number;
  m?: number;
  count: number;
  seed?: number;
}): Float32Array {
  const m = opts.m ?? 0;
  const key = `${opts.n}:${opts.l}:${m}:${opts.count}:${opts.seed ?? 1}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const n = opts.n;
  const l = opts.l;
  const rMax = rMaxA0(n, l);
  const bins = 1600;
  const cdf = new Float64Array(bins);
  let acc = 0;
  for (let i = 1; i < bins; i += 1) {
    const r = (i / bins) * rMax;
    const R = radialR(n, l, r);
    acc += r * r * R * R;
    cdf[i] = acc;
  }
  const total = cdf[bins - 1] ?? 1;
  for (let i = 0; i < bins; i += 1) cdf[i] = (cdf[i] ?? 0) / total;

  let s = opts.seed ?? 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };

  const out = new Float32Array(opts.count * 3);
  for (let k = 0; k < opts.count; k += 1) {
    const u = rand();
    let lo = 0;
    let hi = bins - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((cdf[mid] ?? 0) < u) lo = mid;
      else hi = mid;
    }
    const r = (hi / bins) * rMax;
    const mu = sampleMu(l, m, rand());
    const phi = rand() * Math.PI * 2;
    const st = Math.sqrt(Math.max(0, 1 - mu * mu));
    const o = k * 3;
    out[o] = r * st * Math.cos(phi);
    out[o + 1] = r * mu;
    out[o + 2] = r * st * Math.sin(phi);
  }
  cache.set(key, out);
  return out;
}

/** World units per a0 so that state (n, ℓ) fills roughly `target` world units. */
export function worldScale(n: number, target = 2.4, l = 0): number {
  const ns = effectiveN(n, l);
  return target / (2.2 * ns * ns);
}

/** Radial probability density r² R(r)² on [0, rMax], both in a0. */
export function radialProbability(n: number, l: number, points = 240): { r: Float64Array; p: Float64Array } {
  const rMax = rMaxA0(n, l);
  const r = new Float64Array(points);
  const p = new Float64Array(points);
  let max = 1e-18;
  for (let i = 0; i < points; i += 1) {
    const ri = (i / (points - 1)) * rMax;
    const R = radialR(n, l, ri);
    const val = ri * ri * R * R;
    r[i] = ri;
    p[i] = val;
    if (val > max) max = val;
  }
  for (let i = 0; i < points; i += 1) p[i] = (p[i] ?? 0) / max;
  return { r, p };
}
