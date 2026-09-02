import { describe, expect, it } from 'vitest';
import { integrateBlockade, N_PTS, TAU_MAX } from './blockade.ts';

const tau = (i: number) => (i / (N_PTS - 1)) * TAU_MAX;

describe('two-atom blockade dynamics (Fig. 5)', () => {
  it('conserves probability', () => {
    for (const v of [0, 2, 20]) {
      const c = integrateBlockade(v);
      for (let i = 0; i < N_PTS; i += 1) {
        expect((c.gg[i] ?? 0) + (c.w[i] ?? 0) + (c.rr[i] ?? 0)).toBeCloseTo(1, 6);
      }
    }
  });

  it('without interaction the atoms are independent: P_rr = sin⁴(Ωt/2), P_gg = cos⁴(Ωt/2)', () => {
    const c = integrateBlockade(0);
    for (let i = 0; i < N_PTS; i += 7) {
      const t = tau(i);
      expect(c.rr[i]).toBeCloseTo(Math.sin(t / 2) ** 4, 7);
      expect(c.gg[i]).toBeCloseTo(Math.cos(t / 2) ** 4, 7);
    }
  });

  it('deep in blockade |rr⟩ is frozen out and |gg⟩ ↔ |W⟩ oscillates at √2 Ω', () => {
    const v = 40;
    const c = integrateBlockade(v);
    let maxRR = 0;
    for (let i = 0; i < N_PTS; i += 1) maxRR = Math.max(maxRR, c.rr[i] ?? 0);
    // Perturbatively the |rr⟩ leakage is of order (Ω/V)²·const; well under 1% at V = 40 Ω.
    expect(maxRR).toBeLessThan(0.01);

    // First return of |gg⟩ to ~1 happens at √2 Ω t = 2π, i.e. τ = 2π/√2.
    const target = (2 * Math.PI) / Math.SQRT2;
    let best = 0;
    let bestGap = Infinity;
    for (let i = 1; i < N_PTS; i += 1) {
      const t = tau(i);
      if (t < target * 0.6 || t > target * 1.4) continue;
      const gap = 1 - (c.gg[i] ?? 0);
      if (gap < bestGap) {
        bestGap = gap;
        best = t;
      }
    }
    expect(best / target).toBeCloseTo(1, 1);
    expect(bestGap).toBeLessThan(0.02);
  });

  it('increasing V monotonically suppresses the peak |rr⟩ population', () => {
    let prev = Infinity;
    for (const v of [0, 1, 2, 4, 8, 16]) {
      const c = integrateBlockade(v);
      let peak = 0;
      for (let i = 0; i < N_PTS; i += 1) peak = Math.max(peak, c.rr[i] ?? 0);
      expect(peak).toBeLessThanOrEqual(prev + 1e-9);
      prev = peak;
    }
  });
});
