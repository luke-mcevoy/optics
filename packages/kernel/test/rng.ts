/**
 * Deterministic RNG for property tests. Seeded so a failure is reproducible
 * and CI never flakes. (mulberry32 — small, well-distributed enough for
 * fuzzing physical parameter ranges.)
 */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Uniform in [lo, hi). */
export const uniform = (rnd: () => number, lo: number, hi: number): number =>
  lo + (hi - lo) * rnd();

/** Log-uniform in [lo, hi) — the right sampler for physical magnitudes. */
export const logUniform = (rnd: () => number, lo: number, hi: number): number =>
  Math.exp(uniform(rnd, Math.log(lo), Math.log(hi)));

/** Random element of a non-empty array. */
export const pick = <T>(rnd: () => number, xs: readonly T[]): T => {
  const x = xs[Math.floor(rnd() * xs.length)];
  if (x === undefined) throw new Error('pick from empty array');
  return x;
};
