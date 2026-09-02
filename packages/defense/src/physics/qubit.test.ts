import { describe, expect, it } from 'vitest';
import {
  blochFromAngles,
  drivenBloch,
  generalisedRabi,
  mixture,
  p1FromTheta,
  pPlusAlong,
  purity,
  rabiP1,
  ramseyP1,
} from './qubit.ts';

describe('Bloch sphere', () => {
  it('poles and equator', () => {
    expect(blochFromAngles(0, 0)).toEqual([0, 0, 1]);
    expect(blochFromAngles(Math.PI, 0)[2]).toBeCloseTo(-1, 12);
    const plus = blochFromAngles(Math.PI / 2, 0);
    expect(plus[0]).toBeCloseTo(1, 12);
    expect(p1FromTheta(Math.PI / 2)).toBeCloseTo(0.5, 12);
  });
  it('a pure state has purity 1; a 50/50 mixture of |0⟩ and |1⟩ has purity 1/2', () => {
    expect(purity(blochFromAngles(1.1, 0.4))).toBeCloseTo(1, 12);
    const m = mixture([blochFromAngles(0, 0), blochFromAngles(Math.PI, 0)]);
    expect(purity(m)).toBeCloseTo(0.5, 12);
  });
  it('|+⟩ and the |0⟩/|1⟩ mixture agree along z but differ along x', () => {
    const plus = blochFromAngles(Math.PI / 2, 0);
    const m = mixture([blochFromAngles(0, 0), blochFromAngles(Math.PI, 0)]);
    expect(pPlusAlong(plus, [0, 0, 1])).toBeCloseTo(0.5, 12);
    expect(pPlusAlong(m, [0, 0, 1])).toBeCloseTo(0.5, 12);
    expect(pPlusAlong(plus, [1, 0, 0])).toBeCloseTo(1, 12);
    expect(pPlusAlong(m, [1, 0, 0])).toBeCloseTo(0.5, 12);
  });
});

describe('Rabi oscillation', () => {
  it('a resonant π pulse inverts the qubit and a 2π pulse returns it', () => {
    expect(rabiP1(1, 0, Math.PI)).toBeCloseTo(1, 12);
    expect(rabiP1(1, 0, 2 * Math.PI)).toBeCloseTo(0, 12);
  });
  it('a detuned drive never reaches |1⟩: peak Ω²/(Ω²+Δ²), faster oscillation', () => {
    const om = 1;
    const de = 1;
    const op = generalisedRabi(om, de);
    expect(op).toBeCloseTo(Math.SQRT2, 12);
    expect(rabiP1(om, de, Math.PI / op)).toBeCloseTo(0.5, 12);
    let max = 0;
    for (let i = 0; i < 2000; i += 1) max = Math.max(max, rabiP1(om, de, (i / 2000) * 20));
    expect(max).toBeLessThanOrEqual(0.5 + 1e-9);
  });
  it('the Bloch trajectory agrees with the population formula and stays on the sphere', () => {
    for (const [om, de, t] of [
      [1, 0, 0.7],
      [1, 2, 1.3],
      [2, -1, 3.1],
    ] as const) {
      const r = drivenBloch(om, de, t);
      expect(Math.hypot(...r)).toBeCloseTo(1, 12);
      expect((1 - r[2]) / 2).toBeCloseTo(rabiP1(om, de, t), 12);
    }
  });
});

describe('Ramsey', () => {
  it('fringes in detuning with period 2π/T and unit contrast', () => {
    const T = 3;
    expect(ramseyP1(0, T)).toBeCloseTo(1, 12);
    expect(ramseyP1(Math.PI / T, T)).toBeCloseTo(0, 12);
    expect(ramseyP1((2 * Math.PI) / T, T)).toBeCloseTo(1, 12);
  });
});
