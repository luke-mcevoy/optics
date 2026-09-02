import { describe, expect, it } from 'vitest';
import {
  breitRabiHz,
  clockQuadraticHzPerG2,
  clockSensitivityHzPerG,
  clockShiftHz,
  coneAngleRad,
  couplingAngleRad,
  dephasingTimeS,
  electronToNuclearMomentRatio,
  gaussianContrast,
  groundHyperfineHz,
  landeGF,
  linearZeemanHzPerG,
  RB87_HFS,
} from './hyperfine.ts';

const MHZ = 1e6;

describe('⁸⁷Rb ground-state hyperfine structure (Steck)', () => {
  it('F = 2 sits 3/8 ΔE above and F = 1 5/8 ΔE below the centre of gravity', () => {
    const dE = RB87_HFS.groundSplittingHz;
    expect(groundHyperfineHz(2)).toBeCloseTo((3 / 8) * dE, -3);
    expect(groundHyperfineHz(1)).toBeCloseTo((-5 / 8) * dE, -3);
    expect(groundHyperfineHz(2) - groundHyperfineHz(1)).toBeCloseTo(dE, -3);
  });
  it('Breit–Rabi at zero field reproduces the hyperfine levels for every m_F', () => {
    for (const m of [-2, -1, 0, 1, 2]) expect(breitRabiHz(2, m, 0)).toBeCloseTo(groundHyperfineHz(2), -2);
    for (const m of [-1, 0, 1]) expect(breitRabiHz(1, m, 0)).toBeCloseTo(groundHyperfineHz(1), -2);
  });
  it('Landé factors: g_F ≈ +1/2 for F = 2 and −1/2 for F = 1', () => {
    expect(landeGF(2)).toBeCloseTo(0.4998, 3);
    expect(landeGF(1)).toBeCloseTo(-0.5018, 3);
  });
});

describe('Zeeman effect', () => {
  it('linear Zeeman slope of |2, ±1⟩ is ±0.70 MHz/G and of the stretched states ±1.40 MHz/G', () => {
    expect(linearZeemanHzPerG(2, 1) / MHZ).toBeCloseTo(0.6996, 3);
    expect(linearZeemanHzPerG(2, -1) / MHZ).toBeCloseTo(-0.6996, 3);
    expect(linearZeemanHzPerG(2, 2) / MHZ).toBeCloseTo(1.399, 2);
    expect(linearZeemanHzPerG(1, 1) / MHZ).toBeCloseTo(-0.7024, 3);
  });
  it('Breit–Rabi agrees with the linear slopes at small field', () => {
    const b = 0.01;
    for (const [F, m] of [
      [2, 1],
      [2, -1],
      [2, 2],
      [2, -2],
      [1, 1],
      [1, -1],
    ] as const) {
      const slope = (breitRabiHz(F, m, b) - breitRabiHz(F, m, 0)) / b;
      expect(slope / MHZ).toBeCloseTo(linearZeemanHzPerG(F, m) / MHZ, 3);
    }
  });
  it('the trace of the Zeeman Hamiltonian vanishes: the eight energies always sum to zero', () => {
    for (const b of [0, 8.6, 100, 1000, 5000]) {
      let sum = 0;
      for (const m of [-2, -1, 0, 1, 2]) sum += breitRabiHz(2, m, b);
      for (const m of [-1, 0, 1]) sum += breitRabiHz(1, m, b);
      expect(sum / RB87_HFS.groundSplittingHz).toBeCloseTo(0, 9);
    }
  });
  it('stretched states are exactly linear in B', () => {
    const e = (b: number) => breitRabiHz(2, 2, b);
    expect(e(200) - e(100)).toBeCloseTo(e(100) - e(0), 3);
  });
  it('high field: every level tends to the Paschen–Back slope ±g_J μ_B / 2', () => {
    const b1 = 20000;
    const b2 = 20001;
    const slopeMhz = (F: number, m: number) => (breitRabiHz(F, m, b2) - breitRabiHz(F, m, b1)) / MHZ;
    const pb = (RB87_HFS.gJ * RB87_HFS.muBHzPerG) / 2 / MHZ;
    expect(Math.abs(slopeMhz(2, 0))).toBeCloseTo(pb, 1);
    expect(Math.abs(slopeMhz(1, 0))).toBeCloseTo(pb, 1);
  });
});

describe('the clock transition', () => {
  it('quadratic coefficient is 575.15 Hz/G²', () => {
    expect(clockQuadraticHzPerG2()).toBeCloseTo(575.15, 1);
  });
  it('Breit–Rabi clock shift matches 575.15 B² at the paper’s 8.6 G (≈ 42.5 kHz)', () => {
    const b = 8.6;
    expect(clockShiftHz(b)).toBeCloseTo(clockQuadraticHzPerG2() * b * b, -1);
    expect(clockShiftHz(b)).toBeCloseTo(42538, -2);
    expect(breitRabiHz(2, 0, b) - breitRabiHz(1, 0, b) - RB87_HFS.groundSplittingHz).toBeCloseTo(clockShiftHz(b), 0);
  });
  it('sensitivity at 8.6 G is ~9.9 kHz/G, about 70× below the |2,±1⟩ slope', () => {
    const s = clockSensitivityHzPerG(8.6);
    expect(s).toBeCloseTo(2 * clockQuadraticHzPerG2() * 8.6, -1);
    expect(linearZeemanHzPerG(2, 1) / s).toBeGreaterThan(65);
    expect(linearZeemanHzPerG(2, 1) / s).toBeLessThan(75);
  });
  it('sensitivity is the derivative of the shift', () => {
    const b = 8.6;
    const h = 1e-3;
    expect(clockSensitivityHzPerG(b)).toBeCloseTo((clockShiftHz(b + h) - clockShiftHz(b - h)) / (2 * h), 3);
  });
});

describe('vector model and dephasing helpers', () => {
  it('electron moment is ~670× the nuclear moment', () => {
    expect(electronToNuclearMomentRatio()).toBeGreaterThan(650);
    expect(electronToNuclearMomentRatio()).toBeLessThan(700);
  });
  it('I·J angle: 63.4° for F = 2, 138.2° for F = 1', () => {
    expect((couplingAngleRad(2) * 180) / Math.PI).toBeCloseTo(63.4, 1);
    expect((couplingAngleRad(1) * 180) / Math.PI).toBeCloseTo(138.2, 1);
  });
  it('m_F = 0 lies in the plane; stretched states make the smallest cone', () => {
    expect(coneAngleRad(2, 0)).toBeCloseTo(Math.PI / 2, 12);
    expect(coneAngleRad(2, 2)).toBeLessThan(coneAngleRad(2, 1));
    expect((coneAngleRad(2, 2) * 180) / Math.PI).toBeCloseTo(35.3, 1);
  });
  it('Gaussian Ramsey contrast: unity at t = 0 and 1/e at the dephasing time', () => {
    const sigma = 700;
    expect(gaussianContrast(sigma, 0)).toBe(1);
    expect(gaussianContrast(sigma, dephasingTimeS(sigma))).toBeCloseTo(Math.exp(-1), 10);
  });
  it('1 mG of field noise at 8.6 G: ~0.3 ms for a |2,±1⟩ qubit vs ~23 ms for the clock qubit', () => {
    const dB = 1e-3;
    const linear = dephasingTimeS(linearZeemanHzPerG(2, 1) * dB);
    const clock = dephasingTimeS(clockSensitivityHzPerG(8.6) * dB);
    expect(linear * 1e3).toBeCloseTo(0.32, 1);
    expect(clock * 1e3).toBeCloseTo(22.7, 0);
  });
});
