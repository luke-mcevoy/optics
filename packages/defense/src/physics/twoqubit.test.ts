import { describe, expect, it } from 'vitest';
import {
  apply1,
  chsh,
  classicalChshBound,
  cnot,
  correlation,
  correlationMixed,
  cz,
  depolarisedBellDiagnostics,
  fidelity,
  H_GATE,
  KET00,
  parity,
  PHI_PLUS,
  probabilities,
  purityOf,
  reducedBloch,
  rotEquatorial,
  rotY,
  type State,
} from './twoqubit.ts';

const KET11: State = [[0, 0], [0, 0], [0, 0], [1, 0]];

describe('gates', () => {
  it('H⊗I then CNOT makes the Bell state; (I⊗H) CZ (I⊗H) equals CNOT', () => {
    const bell = cnot(apply1(KET00, H_GATE, 0));
    expect(fidelity(bell, PHI_PLUS)).toBeCloseTo(1, 12);
    const viaCz = apply1(cz(apply1(apply1(KET00, H_GATE, 0), H_GATE, 1)), H_GATE, 1);
    expect(fidelity(viaCz, PHI_PLUS)).toBeCloseTo(1, 12);
  });
  it('a product state has pure reduced states; the Bell state has maximally mixed ones', () => {
    const prod = apply1(apply1(KET00, H_GATE, 0), H_GATE, 1);
    expect(purityOf(reducedBloch(prod, 0))).toBeCloseTo(1, 12);
    expect(purityOf(reducedBloch(prod, 1))).toBeCloseTo(1, 12);
    expect(purityOf(reducedBloch(PHI_PLUS, 0))).toBeCloseTo(0.5, 12);
    expect(purityOf(reducedBloch(PHI_PLUS, 1))).toBeCloseTo(0.5, 12);
  });
  it('CZ on |++⟩ entangles: reduced Bloch vectors collapse to zero', () => {
    const s = cz(apply1(apply1(KET00, H_GATE, 0), H_GATE, 1));
    const r = reducedBloch(s, 0);
    expect(Math.hypot(...r)).toBeCloseTo(0, 12);
  });
  it('rotations are unitary and rotY(π) flips a qubit', () => {
    const s = apply1(KET00, rotY(Math.PI), 1);
    expect(probabilities(s)[1]).toBeCloseTo(1, 12);
    const t = apply1(KET00, rotEquatorial(Math.PI / 2, 0.7), 0);
    expect(probabilities(t).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(probabilities(t)[2]).toBeCloseTo(0.5, 12);
  });
});

describe('correlations and Bell tests', () => {
  it('|Φ+⟩: E(a,b) = cos(a − b); perfect correlation in both z and x bases', () => {
    expect(correlation(PHI_PLUS, 0, 0)).toBeCloseTo(1, 12);
    expect(correlation(PHI_PLUS, Math.PI / 2, Math.PI / 2)).toBeCloseTo(1, 12);
    expect(correlation(PHI_PLUS, 0.3, 1.1)).toBeCloseTo(Math.cos(0.8), 12);
  });
  it('the classical mixture of |00⟩ and |11⟩ is correlated in z but not in x', () => {
    const mix = [
      { w: 0.5, s: KET00 },
      { w: 0.5, s: KET11 },
    ];
    expect(correlationMixed(mix, 0, 0)).toBeCloseTo(1, 12);
    expect(correlationMixed(mix, Math.PI / 2, Math.PI / 2)).toBeCloseTo(0, 12);
    expect(correlationMixed(mix, 0.3, 1.1)).toBeCloseTo(Math.cos(0.3) * Math.cos(1.1), 12);
  });
  it('CHSH: quantum 2√2 at the optimal angles; every deterministic local strategy ≤ 2', () => {
    const E = (a: number, b: number) => correlation(PHI_PLUS, a, b);
    const S = chsh(E, 0, Math.PI / 2, Math.PI / 4, (3 * Math.PI) / 4);
    expect(S).toBeCloseTo(2 * Math.SQRT2, 10);
    expect(classicalChshBound()).toBe(2);
    const mix = [
      { w: 0.5, s: KET00 },
      { w: 0.5, s: KET11 },
    ];
    const Em = (a: number, b: number) => correlationMixed(mix, a, b);
    expect(Math.abs(chsh(Em, 0, Math.PI / 2, Math.PI / 4, (3 * Math.PI) / 4))).toBeLessThanOrEqual(2 + 1e-12);
  });
  it('parity oscillation: unit amplitude −cos 2φ for |Φ+⟩, flat for |00⟩', () => {
    expect(parity(PHI_PLUS, 0)).toBeCloseTo(-1, 12);
    expect(parity(PHI_PLUS, Math.PI / 4)).toBeCloseTo(0, 12);
    expect(parity(PHI_PLUS, Math.PI / 2)).toBeCloseTo(1, 12);
    for (const phi of [0, 0.4, 1.3]) expect(Math.abs(parity(KET00, phi))).toBeLessThan(1e-9);
  });
  it('depolarised Bell diagnostics reproduce F = (P00+P11)/2 + C/2', () => {
    const d = depolarisedBellDiagnostics(0.9);
    expect(d.fidelity).toBeCloseTo(0.925, 12);
    expect(d.populations / 2 + d.contrast / 2).toBeCloseTo(d.fidelity, 12);
    expect(depolarisedBellDiagnostics(1).fidelity).toBe(1);
    expect(depolarisedBellDiagnostics(0).fidelity).toBeCloseTo(0.25, 12);
  });
});
