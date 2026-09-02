import { describe, expect, it } from 'vitest';
import { PAPER } from '../data/paper.ts';
import {
  blockadeRadiusUm,
  collectionFraction,
  collectionHalfAngle,
  rayleighRangeUm,
  rbC6EstimateGHzUm6,
  waistAtUm,
} from './beams.ts';
import { collectionNA } from './formulas.ts';

describe('Gaussian beam envelope drawn in Fig. 1', () => {
  it('z_R = π w0² / λ: a 1 μm waist at 852 nm has z_R ≈ 3.69 μm', () => {
    expect(rayleighRangeUm(1, 0.852)).toBeCloseTo(Math.PI / 0.852, 12);
    expect(rayleighRangeUm(1, 0.852)).toBeCloseTo(3.687, 3);
  });
  it('w(z_R) = √2 w0 and w(0) = w0', () => {
    const zR = rayleighRangeUm(1, 0.852);
    expect(waistAtUm(0, 1, zR)).toBe(1);
    expect(waistAtUm(zR, 1, zR)).toBeCloseTo(Math.SQRT2, 12);
  });
  it('far from the waist the envelope becomes the divergence cone w ≈ w0 z / z_R', () => {
    const zR = 3.687;
    const z = 200 * zR;
    expect(waistAtUm(z, 1, zR) / (z / zR)).toBeCloseTo(1, 4);
  });
});

describe('collection cone', () => {
  it('agrees with the independent formula in formulas.ts', () => {
    for (const na of [0.2, 0.5, PAPER.imaging.na, 0.9]) {
      expect(collectionFraction(na)).toBeCloseTo(collectionNA(na), 12);
    }
  });
  it('NA 0.65 has a 40.5° half-angle', () => {
    expect((collectionHalfAngle(0.65) * 180) / Math.PI).toBeCloseTo(40.54, 1);
  });
});

describe('blockade radius shown in Fig. 1 and the README', () => {
  it('C₆ estimate is anchored on the published 70S value', () => {
    expect(rbC6EstimateGHzUm6(70)).toBeCloseTo(862, 9);
    expect(rbC6EstimateGHzUm6(53)).toBeLessThan(862);
    expect(rbC6EstimateGHzUm6(60)).toBeGreaterThan(rbC6EstimateGHzUm6(53));
  });
  it('for n = 53 and Ω = 2π × 4.6 MHz gives R_b ≈ 4.4 μm — larger than the 2 μm pair, smaller than the 11 μm pitch', () => {
    const rb = blockadeRadiusUm(rbC6EstimateGHzUm6(PAPER.rydberg.n), PAPER.rydberg.rabiMHz);
    expect(rb).toBeCloseTo(4.4, 1);
    expect(rb).toBeGreaterThan(PAPER.beams.pairSpacingUm);
    expect(rb).toBeLessThan(PAPER.deep.horizontalUm / 16);
  });
  it('scales as Ω^(−1/6)', () => {
    const c6 = 500;
    expect(blockadeRadiusUm(c6, 64)).toBeCloseTo(blockadeRadiusUm(c6, 1) / 2, 12);
  });
});
