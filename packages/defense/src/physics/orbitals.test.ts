import { describe, expect, it } from 'vitest';
import { effectiveN, meanRadiusA0, meanRadiusNm, radialR, rMaxA0, sampleOrbital } from './orbitals.ts';

/** ∫ r² R² dr over [0, rMax] by the trapezoid rule, in a0 units. */
function radialNorm(n: number, l: number, steps = 40000): number {
  // Integrate well past the drawing grid so the exponential tail is included.
  const rMax = 4 * rMaxA0(n, l);
  const h = rMax / steps;
  let acc = 0;
  for (let i = 0; i <= steps; i += 1) {
    const r = i * h;
    const R = radialR(n, l, r);
    const f = r * r * R * R;
    acc += i === 0 || i === steps ? f / 2 : f;
  }
  return acc * h;
}

describe('rubidium quantum defects', () => {
  it('5s has n* ≈ 1.87 and ⟨r⟩ ≈ 0.28 nm — the "quarter of a nanometre" in chapter 02', () => {
    expect(effectiveN(5, 0)).toBeCloseTo(1.869, 3);
    expect(meanRadiusA0(5, 0)).toBeCloseTo(0.5 * 3 * 1.869 ** 2, 2);
    expect(meanRadiusNm(5, 0)).toBeCloseTo(0.277, 2);
  });
  it('53S is several hundred times larger than 5s (≈ 700×)', () => {
    const ratio = meanRadiusA0(53, 0) / meanRadiusA0(5, 0);
    expect(ratio).toBeGreaterThan(600);
    expect(ratio).toBeLessThan(800);
  });
  it('high-ℓ states are nearly hydrogenic', () => {
    expect(effectiveN(10, 3)).toBeCloseTo(10, 1);
    expect(meanRadiusA0(10, 3)).toBeCloseTo(0.5 * (3 * 100 - 12), 0);
  });
});

describe('radial wavefunctions', () => {
  it('hydrogenic states with no defect are normalised', () => {
    // ℓ = 3 carries a negligible defect, so n = 4..8 should integrate to one.
    for (const n of [4, 5, 6, 8]) {
      expect(radialNorm(n, 3)).toBeCloseTo(1, 2);
    }
  });
  it('5s and 5p remain normalised after rescaling to the defect radius', () => {
    expect(radialNorm(5, 0)).toBeCloseTo(1, 2);
    expect(radialNorm(5, 1)).toBeCloseTo(1, 2);
  });
  it('an ns state has n − 1 radial nodes', () => {
    const n = 5;
    const rMax = rMaxA0(n, 0);
    let nodes = 0;
    let prev = radialR(n, 0, 1e-3);
    for (let i = 1; i <= 4000; i += 1) {
      const r = (i / 4000) * rMax;
      const cur = radialR(n, 0, r);
      if (prev !== 0 && Math.sign(cur) !== Math.sign(prev) && Math.abs(cur) > 1e-12) nodes += 1;
      prev = cur;
    }
    expect(nodes).toBe(n - 1);
  });
});

describe('Monte Carlo cloud used by the 3D boards', () => {
  it('sampled radii have the analytic mean radius (5s, 12k points)', () => {
    const pts = sampleOrbital({ n: 5, l: 0, count: 12000, seed: 7 });
    let sum = 0;
    for (let i = 0; i < pts.length; i += 3) {
      sum += Math.hypot(pts[i] ?? 0, pts[i + 1] ?? 0, pts[i + 2] ?? 0);
    }
    const mean = sum / (pts.length / 3);
    expect(mean / meanRadiusA0(5, 0)).toBeCloseTo(1, 1);
  });
  it('is deterministic for a given seed', () => {
    const a = sampleOrbital({ n: 6, l: 1, count: 100, seed: 3 });
    const b = sampleOrbital({ n: 6, l: 1, count: 100, seed: 3 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});
