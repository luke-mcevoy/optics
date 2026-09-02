import { describe, expect, it } from 'vitest';
import { blockadeRadiusUm, rbC6EstimateGHzUm6 } from './beams.ts';
import {
  bindingCm,
  bindingEV,
  bindingTHz,
  blackbodyRateHz,
  dipoleDebye,
  lifetimeS,
  localExponent,
  meanRadiusUm,
  orbitPeriodS,
  radiativeLifetimeS,
  relativePolarizability,
  spacingGHz,
  vdwShiftMHz,
} from './rydberg.ts';

describe('Rydberg series', () => {
  it('53S is bound by ~1.32 THz = 44 cm⁻¹ = 5.5 meV', () => {
    expect(bindingTHz(53)).toBeCloseTo(1.323, 2);
    expect(bindingCm(53)).toBeCloseTo(44.1, 0);
    expect(bindingEV(53) * 1e3).toBeCloseTo(5.47, 1);
  });
  it('level spacing 53S → 54S is ~51.5 GHz and falls as n*⁻³', () => {
    expect(spacingGHz(53)).toBeCloseTo(51.5, 0);
    expect(localExponent((n) => spacingGHz(n), 53)).toBeCloseTo(-3, 0);
  });
  it('the 53S orbit is ~0.2 μm in radius with a ~19 ps classical period', () => {
    expect(meanRadiusUm(53)).toBeCloseTo(0.197, 2);
    expect(orbitPeriodS(53) * 1e12).toBeCloseTo(18.9, 0);
    expect(localExponent((n) => meanRadiusUm(n), 53)).toBeCloseTo(2, 1);
    expect(localExponent((n) => orbitPeriodS(n), 53)).toBeCloseTo(3, 1);
  });
  it('lifetime: ~170 μs radiative, ~70 μs including 300 K black-body decay', () => {
    expect(radiativeLifetimeS(53) * 1e6).toBeCloseTo(170, -1);
    expect(blackbodyRateHz(53)).toBeCloseTo(8200, -3);
    expect(lifetimeS(53) * 1e6).toBeGreaterThan(60);
    expect(lifetimeS(53) * 1e6).toBeLessThan(80);
    expect(lifetimeS(53, 0)).toBeCloseTo(radiativeLifetimeS(53), 12);
  });
  it('dipole moments of thousands of debye and polarizability scaling n*⁷', () => {
    expect(dipoleDebye(53)).toBeGreaterThan(6000);
    expect(relativePolarizability(53)).toBe(1);
    expect(localExponent((n) => relativePolarizability(n), 53)).toBeCloseTo(7, 6);
  });
});

describe('van der Waals interaction and blockade', () => {
  it('C6 at 53S is ~34 GHz μm⁶ (n*¹¹ from the 70S anchor) and the shift at 2 μm is ~0.5 GHz', () => {
    expect(rbC6EstimateGHzUm6(53)).toBeCloseTo(34, 0);
    expect(vdwShiftMHz(53, 2)).toBeCloseTo(535, -2);
    expect(vdwShiftMHz(53, 4) / vdwShiftMHz(53, 2)).toBeCloseTo(1 / 64, 6);
  });
  it('blockade radius at Ω/2π = 4.6 MHz is ~4.4 μm, comfortably above the 2 μm pair spacing', () => {
    const rb = blockadeRadiusUm(rbC6EstimateGHzUm6(53), 4.6);
    expect(rb).toBeGreaterThan(4);
    expect(rb).toBeLessThan(5);
    expect(vdwShiftMHz(53, rb)).toBeCloseTo(4.6, 6);
  });
});
