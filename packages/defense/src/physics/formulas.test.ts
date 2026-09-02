import { describe, expect, it } from 'vitest';
import {
  acStark,
  blockadeRadius,
  collectionNA,
  poissonPmf,
  poissonSample,
  ramanDifferentialStark,
  rayleighMetres,
  scatteringRate,
  surfaceLogicalError,
  tGateAngularSpacingRad,
  twoPhotonRabi,
} from './formulas.ts';

describe('collection optics', () => {
  it('NA 0.65 objective collects (1 − cos θ)/2 ≈ 12.0% of isotropic emission', () => {
    const theta = Math.asin(0.65);
    expect(collectionNA(0.65)).toBeCloseTo((1 - Math.cos(theta)) / 2, 12);
    expect(collectionNA(0.65)).toBeCloseTo(0.1200, 3);
  });
  it('is monotonic in NA and bounded by one hemisphere', () => {
    let prev = 0;
    for (let na = 0.05; na < 1; na += 0.05) {
      const f = collectionNA(na);
      expect(f).toBeGreaterThan(prev);
      prev = f;
    }
    expect(collectionNA(1)).toBeLessThanOrEqual(0.5);
    expect(collectionNA(0)).toBe(0);
  });
  it('Rayleigh limit for 780 nm at NA 0.65 is 0.73 μm — the number quoted in chapter 09', () => {
    expect(rayleighMetres(780e-9, 0.65) * 1e6).toBeCloseTo(0.732, 3);
  });
});

describe('far-detuned two-level estimates', () => {
  it('two-photon Rabi frequency Ω₁Ω₂/2Δ', () => {
    expect(twoPhotonRabi(2, 3, 6)).toBeCloseTo(0.5, 12);
  });
  it('differential Stark shift vanishes for balanced legs and flips sign with imbalance', () => {
    expect(ramanDifferentialStark(1, 1, 5)).toBe(0);
    expect(ramanDifferentialStark(2, 1, 5)).toBeGreaterThan(0);
    expect(ramanDifferentialStark(1, 2, 5)).toBeLessThan(0);
    expect(ramanDifferentialStark(1, 2, 5)).toBeCloseTo(-ramanDifferentialStark(2, 1, 5), 12);
  });
  it('scattering falls as 1/Δ² while the Stark shift falls as 1/Δ', () => {
    const r1 = scatteringRate(1, 1, 10);
    const r2 = scatteringRate(1, 1, 20);
    expect(r1 / r2).toBeCloseTo(4, 12);
    expect(acStark(1, 10) / acStark(1, 20)).toBeCloseTo(2, 12);
  });
  it('red detuning gives a negative (attractive) light shift', () => {
    expect(acStark(1, -10)).toBeLessThan(0);
    expect(acStark(1, 10)).toBeGreaterThan(0);
  });
});

describe('Rydberg blockade radius', () => {
  it('scales as (C₆/Ω)^(1/6): 64× more drive halves R_b', () => {
    const r = blockadeRadius(1, 1);
    expect(blockadeRadius(1, 64)).toBeCloseTo(r / 2, 12);
    expect(blockadeRadius(64, 1)).toBeCloseTo(2 * r, 12);
  });
  it('is zero for no drive', () => {
    expect(blockadeRadius(1, 0)).toBe(0);
  });
});

describe('code scaling toys', () => {
  it('p^((d+1)/2): going from d=3 to d=5 gains a factor 1/p', () => {
    const p = 0.01;
    expect(surfaceLogicalError(p, 3) / surfaceLogicalError(p, 5)).toBeCloseTo(1 / p, 6);
  });
  it('bigger distance is quieter for any p below one', () => {
    for (const p of [0.001, 0.01, 0.1, 0.3]) {
      expect(surfaceLogicalError(p, 5)).toBeLessThan(surfaceLogicalError(p, 3));
      expect(surfaceLogicalError(p, 7)).toBeLessThan(surfaceLogicalError(p, 5));
    }
  });
  it('T-gate spacing halves per T: π, π/4, π/8, …', () => {
    expect(tGateAngularSpacingRad(0)).toBe(Math.PI);
    expect(tGateAngularSpacingRad(1)).toBeCloseTo(Math.PI / 4, 12);
    expect(tGateAngularSpacingRad(2)).toBeCloseTo(Math.PI / 8, 12);
  });
});

describe('Poisson model behind the camera board', () => {
  it('pmf sums to one and has the right mean', () => {
    for (const mu of [0.5, 3, 12]) {
      let sum = 0;
      let mean = 0;
      for (let k = 0; k < 200; k += 1) {
        const p = poissonPmf(k, mu);
        sum += p;
        mean += k * p;
      }
      expect(sum).toBeCloseTo(1, 9);
      expect(mean).toBeCloseTo(mu, 8);
    }
  });
  it('sampler mean and variance match μ for small and large μ (seeded)', () => {
    let s = 12345;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
    for (const mu of [4, 60]) {
      const n = 40000;
      let sum = 0;
      let sq = 0;
      for (let i = 0; i < n; i += 1) {
        const k = poissonSample(mu, rand);
        sum += k;
        sq += k * k;
      }
      const mean = sum / n;
      const variance = sq / n - mean * mean;
      expect(mean).toBeCloseTo(mu, 0);
      expect(variance / mu).toBeGreaterThan(0.9);
      expect(variance / mu).toBeLessThan(1.1);
    }
  });
});
