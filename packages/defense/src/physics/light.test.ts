import { describe, expect, it } from 'vitest';
import {
  clebschGordan,
  dipolePotentialJ,
  HBAR,
  lineStrength,
  omegaOf,
  peakIntensity,
  pumpStep,
  ramanPhotonsPerPi,
  RB_LINES,
  scatteringRateHz,
  tweezer,
  twoLevelPolarizability,
} from './light.ts';

describe('polarizability', () => {
  it('is in phase (Re > 0) below resonance, out of phase above, and purely absorptive on resonance', () => {
    expect(twoLevelPolarizability(-3).re).toBeGreaterThan(0);
    expect(twoLevelPolarizability(3).re).toBeLessThan(0);
    expect(twoLevelPolarizability(0).re).toBeCloseTo(0, 12);
    expect(twoLevelPolarizability(0).im).toBeCloseTo(1, 12);
  });
  it('Im falls as 1/Δ² and Re as 1/Δ far from resonance', () => {
    const a = twoLevelPolarizability(-20);
    const b = twoLevelPolarizability(-40);
    expect(a.im / b.im).toBeCloseTo(4, 1);
    expect(a.re / b.re).toBeCloseTo(2, 1);
  });
});

describe('dipole trap (Grimm et al.)', () => {
  const I = peakIntensity(1e-3, 1e-6);
  it('1 mW at 1 μm waist has peak intensity 2P/πw0² ≈ 6.4 × 10⁸ W/m²', () => {
    expect(I).toBeCloseTo(6.366e8, -5);
  });
  it('red-detuned light attracts, blue-detuned repels', () => {
    expect(dipolePotentialJ(852e-9, I)).toBeLessThan(0);
    expect(dipolePotentialJ(760e-9, I)).toBeGreaterThan(0);
  });
  it('852 nm, 1 mW, 1 μm: depth ≈ 0.3 mK, matching the two-level estimate within 30%', () => {
    const t = tweezer(852e-9, 1e-3, 1e-6);
    expect(-t.depthMK).toBeGreaterThan(0.25);
    expect(-t.depthMK).toBeLessThan(0.35);
    const w0 = omegaOf(RB_LINES.d2.lambdaM);
    const delta = omegaOf(852e-9) - w0;
    const twoLevel = ((3 * Math.PI * 299792458 ** 2 * RB_LINES.d2.gamma) / (2 * w0 ** 3)) * (I / delta);
    expect(Math.abs(t.depthJ / twoLevel - 1)).toBeLessThan(0.3);
  });
  it('depth over scattering: U/ħΓ_sc grows with detuning (≈ Δ/Γ in the two-level limit)', () => {
    const r = (lambda: number) => Math.abs(dipolePotentialJ(lambda, I)) / (HBAR * scatteringRateHz(lambda, I));
    expect(r(1064e-9)).toBeGreaterThan(r(852e-9));
    expect(r(852e-9)).toBeGreaterThan(r(800e-9));
    const w0 = omegaOf(RB_LINES.d2.lambdaM);
    const ratioTwoLevel = Math.abs(omegaOf(852e-9) - w0) / RB_LINES.d2.gamma;
    expect(Math.abs(r(852e-9) / ratioTwoLevel - 1)).toBeLessThan(0.35);
  });
  it('trap frequencies scale as √(depth): radial ≫ axial for w0 ≪ z_R', () => {
    const t = tweezer(852e-9, 1e-3, 1e-6);
    expect(t.radialHz).toBeGreaterThan(t.axialHz);
    const t2 = tweezer(852e-9, 4e-3, 1e-6);
    expect(t2.radialHz / t.radialHz).toBeCloseTo(2, 3);
  });
});

describe('Raman scattering budget', () => {
  it('photons per π pulse = πΓ/2Δ ≈ 1.7 × 10⁻⁵ at 550 GHz', () => {
    const g = 2 * Math.PI * 6.0666e6;
    const d = 2 * Math.PI * 550e9;
    expect(ramanPhotonsPerPi(g, d)).toBeCloseTo(1.73e-5, 6);
  });
});

describe('Clebsch–Gordan and selection rules', () => {
  it('spin-½ ⊗ spin-½ singlet and triplet coefficients', () => {
    expect(clebschGordan(0.5, 0.5, 0.5, -0.5, 1, 0)).toBeCloseTo(Math.SQRT1_2, 10);
    expect(clebschGordan(0.5, 0.5, 0.5, -0.5, 0, 0)).toBeCloseTo(Math.SQRT1_2, 10);
    expect(clebschGordan(0.5, -0.5, 0.5, 0.5, 0, 0)).toBeCloseTo(-Math.SQRT1_2, 10);
    expect(clebschGordan(0.5, 0.5, 0.5, 0.5, 1, 1)).toBeCloseTo(1, 10);
  });
  it('for each excited F′=3 sublevel the decay branchings to F=2 sum to one', () => {
    for (let mp = -3; mp <= 3; mp += 1) {
      let sum = 0;
      for (const q of [-1, 0, 1]) {
        const m = mp - q;
        if (Math.abs(m) <= 2) sum += lineStrength(2, m, q, 3);
      }
      expect(sum).toBeCloseTo(1, 10);
    }
  });
  it('σ⁺ light cannot excite |2,+2⟩ → F′=2 but does drive the F′=3 cycling transition', () => {
    expect(lineStrength(2, 2, 1, 2)).toBe(0);
    expect(lineStrength(2, 2, 1, 3)).toBeCloseTo(1, 10);
  });
  it('σ⁺ pumping on F=2→F′=3 concentrates population in |2,+2⟩, which keeps cycling (bright)', () => {
    let pop = [0.2, 0.2, 0.2, 0.2, 0.2];
    let lastScatter = 1;
    for (let i = 0; i < 3000; i += 1) {
      const r = pumpStep(pop, 2, 3, 1, 0.1);
      pop = r.pop;
      lastScatter = r.scattered;
    }
    expect(pop.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(pop[4]).toBeGreaterThan(0.999);
    expect(lastScatter).toBeCloseTo(0.1, 6);
  });
  it('σ⁺ pumping on F=2→F′=2 ends in a dark state: |2,+2⟩ has no σ⁺ partner', () => {
    let pop = [0.2, 0.2, 0.2, 0.2, 0.2];
    let last = 1;
    for (let i = 0; i < 3000; i += 1) {
      const r = pumpStep(pop, 2, 2, 1, 0.1);
      pop = r.pop;
      last = r.scattered;
    }
    expect(pop[4]).toBeGreaterThan(0.999);
    expect(last).toBeLessThan(1e-3);
  });
  it('σ⁻ pumping does the mirror image, into |2,−2⟩', () => {
    let pop = [0, 0, 1, 0, 0];
    for (let i = 0; i < 3000; i += 1) pop = pumpStep(pop, 2, 3, -1, 0.1).pop;
    expect(pop[0]).toBeGreaterThan(0.999);
  });
});
