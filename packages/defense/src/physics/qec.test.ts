import { describe, expect, it } from 'vitest';
import { lcg } from '../viz/foundations/bloch2d.ts';
import {
  binomial,
  decodeMatching,
  decodeSpacetime,
  erasureSpans,
  isLogicalError,
  PHENO_THRESHOLD,
  planarLattice,
  repetitionLogicalError,
  scalingLogicalError,
  syndrome,
  trialErasure,
  trialPauli,
  trialPhenomenological,
  xor,
} from './qec.ts';

describe('repetition code', () => {
  it('3-qubit majority vote gives 3p² − 2p³', () => {
    for (const p of [0.01, 0.1, 0.3]) expect(repetitionLogicalError(p, 3)).toBeCloseTo(3 * p * p - 2 * p ** 3, 12);
  });
  it('helps only below p = 1/2 and more so for larger n', () => {
    expect(repetitionLogicalError(0.1, 3)).toBeLessThan(0.1);
    expect(repetitionLogicalError(0.1, 5)).toBeLessThan(repetitionLogicalError(0.1, 3));
    expect(repetitionLogicalError(0.6, 3)).toBeGreaterThan(0.6);
    expect(repetitionLogicalError(0.5, 7)).toBeCloseTo(0.5, 12);
  });
  it('binomial coefficients', () => {
    expect(binomial(5, 2)).toBe(10);
    expect(binomial(7, 0)).toBe(1);
    expect(binomial(4, 5)).toBe(0);
  });
});

describe('planar lattice', () => {
  it('has d² + (d−1)² data qubits and d(d−1) checks', () => {
    for (const d of [3, 5, 7]) {
      const lat = planarLattice(d);
      expect(lat.n).toBe(d * d + (d - 1) * (d - 1));
      expect(lat.m).toBe(d * (d - 1));
    }
  });
  it('every interior edge touches two checks; rough-boundary edges touch one', () => {
    const lat = planarLattice(5);
    for (let e = 0; e < lat.n; e += 1) {
      const g = lat.edges[e]!;
      const expected = g.kind === 'h' && (g.c === 0 || g.c === lat.d - 1) ? 1 : 2;
      expect(lat.checksOf[e]!.length).toBe(expected);
    }
  });
  it('a single error lights its adjacent checks and a logical chain lights none', () => {
    const lat = planarLattice(3);
    const err = new Uint8Array(lat.n);
    err[lat.v(0, 1)] = 1;
    const s = syndrome(lat, err);
    expect(Array.from(s).reduce((a, b) => a + b, 0)).toBe(2);
    expect(s[lat.check(0, 1)]).toBe(1);
    expect(s[lat.check(1, 1)]).toBe(1);
    const chain = new Uint8Array(lat.n);
    for (let j = 0; j < 3; j += 1) chain[lat.h(1, j)] = 1;
    expect(Array.from(syndrome(lat, chain)).every((x) => x === 0)).toBe(true);
    expect(isLogicalError(lat, chain)).toBe(true);
  });
});

describe('matching decoder', () => {
  it('corrects any single error on d = 3, 5', () => {
    for (const d of [3, 5]) {
      const lat = planarLattice(d);
      for (let e = 0; e < lat.n; e += 1) {
        const err = new Uint8Array(lat.n);
        err[e] = 1;
        const { correction, exact } = decodeMatching(lat, syndrome(lat, err));
        expect(exact).toBe(true);
        const residual = xor(err, correction);
        expect(Array.from(syndrome(lat, residual)).every((x) => x === 0)).toBe(true);
        expect(isLogicalError(lat, residual)).toBe(false);
      }
    }
  });
  it('corrects every weight-2 error on d = 5 (t = ⌊(d−1)/2⌋ = 2)', () => {
    const lat = planarLattice(5);
    let failures = 0;
    for (let a = 0; a < lat.n; a += 1) {
      for (let b = a + 1; b < lat.n; b += 1) {
        const err = new Uint8Array(lat.n);
        err[a] = 1;
        err[b] = 1;
        const { correction } = decodeMatching(lat, syndrome(lat, err));
        if (isLogicalError(lat, xor(err, correction))) failures += 1;
      }
    }
    expect(failures).toBe(0);
  });
  it('correction always clears the syndrome (random patterns, union-find path included)', () => {
    const lat = planarLattice(7);
    const rand = lcg(3);
    for (let t = 0; t < 40; t += 1) {
      const err = new Uint8Array(lat.n);
      for (let e = 0; e < lat.n; e += 1) if (rand() < 0.25) err[e] = 1;
      const { correction } = decodeMatching(lat, syndrome(lat, err));
      expect(Array.from(syndrome(lat, xor(err, correction))).every((x) => x === 0)).toBe(true);
    }
  });
  it('below threshold, d = 5 beats d = 3; above it, larger codes are worse', () => {
    const rand = lcg(11);
    const trials = 1500;
    const rate = (d: number, p: number) => {
      const lat = planarLattice(d);
      let fails = 0;
      for (let i = 0; i < trials; i += 1) if (trialPauli(lat, p, rand)) fails += 1;
      return fails / trials;
    };
    expect(rate(5, 0.03)).toBeLessThan(rate(3, 0.03));
    expect(rate(5, 0.25)).toBeGreaterThan(rate(3, 0.25));
  });
});

describe('erasure decoder', () => {
  it('spanning detection', () => {
    const lat = planarLattice(3);
    const er = new Uint8Array(lat.n);
    expect(erasureSpans(lat, er)).toBe(false);
    er[lat.h(0, 0)] = 1;
    er[lat.h(0, 1)] = 1;
    expect(erasureSpans(lat, er)).toBe(false);
    er[lat.h(0, 2)] = 1;
    expect(erasureSpans(lat, er)).toBe(true);
    // a chain that turns a corner
    const er2 = new Uint8Array(lat.n);
    er2[lat.h(0, 0)] = 1;
    er2[lat.v(0, 0)] = 1;
    er2[lat.h(1, 1)] = 1;
    er2[lat.h(1, 2)] = 1;
    expect(erasureSpans(lat, er2)).toBe(true);
  });
  it('tolerates far more erasure than Pauli error at d = 5', () => {
    const lat = planarLattice(5);
    const rand = lcg(5);
    const n = 2000;
    let e = 0;
    let q = 0;
    for (let i = 0; i < n; i += 1) {
      if (trialErasure(lat, 0.2, rand)) e += 1;
      if (trialPauli(lat, 0.2, rand)) q += 1;
    }
    expect(e / n).toBeLessThan(q / n);
    expect(e / n).toBeLessThan(0.1);
  });
});

describe('scaling law', () => {
  it('Λ = p_th/p between consecutive odd distances', () => {
    const p = 0.005;
    const pTh = 0.0107;
    expect(scalingLogicalError(p, 3, pTh) / scalingLogicalError(p, 5, pTh)).toBeCloseTo(pTh / p, 10);
  });
});

describe('union-find matching', () => {
  it('agrees with exact MWPM on random d = 5 syndromes and always clears them', () => {
    const lat = planarLattice(5);
    const rand = lcg(9);
    for (let t = 0; t < 80; t += 1) {
      const err = new Uint8Array(lat.n);
      for (let e = 0; e < lat.n; e += 1) if (rand() < 0.12) err[e] = 1;
      const synd = syndrome(lat, err);
      const nDef = synd.reduce((a, b) => a + b, 0);
      const { correction, exact } = decodeMatching(lat, synd);
      expect(Array.from(syndrome(lat, xor(err, correction))).every((x) => x === 0)).toBe(true);
      if (nDef <= 14) expect(exact).toBe(true);
    }
  });
});

describe('phenomenological (d-round) model', () => {
  it('with zero measurement error, one data-error layer matches the 2D model in distribution', () => {
    const lat = planarLattice(5);
    const p = 0.06;
    const trials = 2500;
    const rand = lcg(17);
    let a = 0;
    let b = 0;
    for (let i = 0; i < trials; i += 1) if (trialPauli(lat, p, rand)) a += 1;
    for (let i = 0; i < trials; i += 1) if (trialPhenomenological(lat, p, rand, { pData: p, pMeas: 0, rounds: 1 })) b += 1;
    expect(Math.abs(a - b) / trials).toBeLessThan(0.04);
  });

  it('a single data error or a single measurement error is corrected for d ≥ 3', () => {
    for (const d of [3, 5]) {
      const lat = planarLattice(d);
      for (let e = 0; e < lat.n; e += 1) {
        const acc = new Uint8Array(lat.n);
        acc[e] = 1;
        const zero: Uint8Array = new Uint8Array(lat.m);
        const s: Uint8Array = syndrome(lat, acc);
        const outcomes: Uint8Array[] = [zero];
        for (let t = 0; t < d; t += 1) outcomes.push(s);
        outcomes.push(s);
        const { correction } = decodeSpacetime(lat, outcomes);
        expect(isLogicalError(lat, xor(acc, correction))).toBe(false);
      }
      for (let c = 0; c < lat.m; c += 1) {
        const zero: Uint8Array = new Uint8Array(lat.m);
        const flipped: Uint8Array = new Uint8Array(lat.m);
        flipped[c] = 1;
        const outcomes: Uint8Array[] = [zero];
        for (let t = 0; t < d; t += 1) outcomes.push(t === 0 ? flipped : zero);
        outcomes.push(zero);
        const { correction } = decodeSpacetime(lat, outcomes);
        expect(correction.some((x) => x === 1)).toBe(false);
        expect(isLogicalError(lat, new Uint8Array(lat.n))).toBe(false);
      }
    }
  });

  it('below threshold, d = 5 beats d = 3 at p = 0.01; above it the order reverses at p = 0.1', () => {
    const rand = lcg(23);
    const trials = 1200;
    const rate = (d: number, p: number) => {
      const lat = planarLattice(d);
      let fails = 0;
      for (let i = 0; i < trials; i += 1) if (trialPhenomenological(lat, p, rand)) fails += 1;
      return fails / trials;
    };
    expect(rate(5, 0.01)).toBeLessThan(rate(3, 0.01));
    expect(rate(5, 0.1)).toBeGreaterThan(rate(3, 0.1));
  });

  it('d = 3 and d = 5 curves cross in [0.02, 0.045] (WHP phenomenological threshold ≈ 2.9–3.3%)', () => {
    const rand = lcg(41);
    const trials = 700;
    const ps = [0.02, 0.026, 0.032, 0.038, 0.045];
    const rate = (d: number, p: number) => {
      const lat = planarLattice(d);
      let fails = 0;
      for (let i = 0; i < trials; i += 1) if (trialPhenomenological(lat, p, rand)) fails += 1;
      return fails / trials;
    };
    const r3 = ps.map((p) => rate(3, p));
    const r5 = ps.map((p) => rate(5, p));
    let cross = PHENO_THRESHOLD;
    let found = false;
    for (let i = 0; i < ps.length - 1; i += 1) {
      const d0 = r5[i]! - r3[i]!;
      const d1 = r5[i + 1]! - r3[i + 1]!;
      if (d0 === 0) {
        cross = ps[i]!;
        found = true;
        break;
      }
      if (d0 * d1 <= 0) {
        const f = Math.abs(d0) / (Math.abs(d0) + Math.abs(d1) || 1);
        cross = ps[i]! + f * (ps[i + 1]! - ps[i]!);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    expect(cross).toBeGreaterThanOrEqual(0.02);
    expect(cross).toBeLessThanOrEqual(0.045);
  });
});
