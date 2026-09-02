import { describe, expect, it } from 'vitest';
import {
  deBroglieM,
  discriminationFidelity,
  dopplerLimitK,
  dopplerTempK,
  GAMMA,
  imagingBudget,
  K_D2,
  langevinStep,
  maxwellBoltzmann,
  recoilTempK,
  recoilVelocity,
  scatterRate,
  temperature1D,
  twoBeamForce,
  vRms,
} from './cooling.ts';
import { lcg } from '../viz/foundations/bloch2d.ts';

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

describe('thermal speeds', () => {
  it('room-temperature rubidium moves at ~290 m/s rms', () => {
    expect(vRms(300)).toBeCloseTo(293, -1);
  });
  it('the Maxwell–Boltzmann distribution is normalised and its second moment is 3k_BT/m', () => {
    const T = 100e-6;
    const vmax = 6 * vRms(T);
    const n = 4000;
    let norm = 0;
    let m2 = 0;
    for (let i = 0; i < n; i += 1) {
      const v = ((i + 0.5) / n) * vmax;
      const f = maxwellBoltzmann(v, T) * (vmax / n);
      norm += f;
      m2 += f * v * v;
    }
    expect(norm).toBeCloseTo(1, 4);
    expect(Math.sqrt(m2)).toBeCloseTo(vRms(T), 4);
  });
  it('de Broglie wavelength at 10 μK is ~59 nm and grows as T^-1/2', () => {
    expect(deBroglieM(10e-6) * 1e9).toBeCloseTo(59, 0);
    expect(deBroglieM(1e-6) / deBroglieM(4e-6)).toBeCloseTo(2, 6);
  });
});

describe('Doppler cooling (Steck values)', () => {
  it('recoil velocity 5.88 mm/s, recoil temperature 362 nK, Doppler limit 146 μK', () => {
    expect(recoilVelocity() * 1e3).toBeCloseTo(5.88, 2);
    expect(recoilTempK() * 1e9).toBeCloseTo(362, 0);
    expect(dopplerLimitK() * 1e6).toBeCloseTo(146, 0);
  });
  it('the general Doppler temperature is minimised at Δ = −Γ/2 and equals the limit there', () => {
    expect(dopplerTempK(-0.5)).toBeCloseTo(dopplerLimitK(), 12);
    expect(dopplerTempK(-0.25)).toBeGreaterThan(dopplerLimitK());
    expect(dopplerTempK(-1)).toBeGreaterThan(dopplerLimitK());
  });
  it('scattering rate saturates at Γ/2 and is Γ/4 at s = 1 on resonance', () => {
    expect(scatterRate(1, 0)).toBeCloseTo(GAMMA / 4, 6);
    expect(scatterRate(1e6, 0) / (GAMMA / 2)).toBeCloseTo(1, 4);
  });
  it('red-detuned counter-propagating beams give a friction force (odd in v, negative slope)', () => {
    const d = -GAMMA / 2;
    expect(twoBeamForce(0, 0.2, d)).toBeCloseTo(0, 30);
    expect(twoBeamForce(1, 0.2, d)).toBeLessThan(0);
    expect(twoBeamForce(-1, 0.2, d)).toBeGreaterThan(0);
    expect(twoBeamForce(1, 0.2, d)).toBeCloseTo(-twoBeamForce(-1, 0.2, d), 30);
    // blue detuning heats
    expect(twoBeamForce(1, 0.2, +GAMMA / 2)).toBeGreaterThan(0);
  });
  it('the Doppler force is strongest for |v| ≈ |Δ|/k, i.e. a capture velocity of a few m/s', () => {
    const d = -GAMMA;
    let best = 0;
    let vBest = 0;
    for (let v = 0; v < 20; v += 0.05) {
      const f = -twoBeamForce(v, 0.5, d);
      if (f > best) {
        best = f;
        vBest = v;
      }
    }
    expect(vBest).toBeGreaterThan(3);
    expect(vBest).toBeLessThan(8);
    expect(Math.abs(vBest - Math.abs(d) / K_D2) / vBest).toBeLessThan(0.5);
  });
  it('a Langevin ensemble cools to the Doppler prediction within 25%', () => {
    const rand = lcg(11);
    const N = 1500;
    const vs = new Float64Array(N);
    for (let i = 0; i < N; i += 1) vs[i] = 2 * gaussian(rand); // start hot: ~2 m/s rms
    const s = 0.2;
    const d = -GAMMA / 2;
    const dt = 2e-6;
    for (let step = 0; step < 3000; step += 1) {
      for (let i = 0; i < N; i += 1) vs[i] = langevinStep(vs[i]!, dt, s, d, gaussian(rand));
    }
    const T = temperature1D(vs);
    expect(Math.abs(T / dopplerTempK(-0.5) - 1)).toBeLessThan(0.25);
  });
});

describe('fluorescence detection', () => {
  it('Poisson discrimination: zero fidelity gain without signal, near-perfect with ~40 counts vs 2', () => {
    expect(discriminationFidelity(2, 2).fidelity).toBeCloseTo(0.5, 6);
    const r = discriminationFidelity(2, 40);
    expect(r.fidelity).toBeGreaterThan(0.999);
    expect(r.threshold).toBeGreaterThan(5);
    expect(r.threshold).toBeLessThan(25);
  });
  it('imaging budget: NA 0.65, 10 ms at s = 1 collects ~10⁴ photons and heats by several mK', () => {
    const b = imagingBudget({ exposureS: 10e-3, s: 1, deltaRad: 0, collection: 0.12, optics: 0.5, qe: 0.7 });
    expect(b.photonsScattered).toBeCloseTo(9.5e4, -4);
    expect(b.meanCounts).toBeGreaterThan(3000);
    expect(b.heatingMK).toBeGreaterThan(10);
  });
});
