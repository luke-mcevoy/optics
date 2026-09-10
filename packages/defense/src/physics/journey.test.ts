import { describe, expect, it } from 'vitest';
import { bitFlipSyndrome, interferenceState, locateBitFlip, samplePair, teachingPair } from './journey.ts';
import { fidelity, PHI_PLUS, probabilities } from './twoqubit.ts';

describe('the introductory experiments', () => {
  it('interference agrees with the independent Ramsey closed form across a full turn', () => {
    for (let i = 0; i <= 128; i++) {
      const phase = i * 2 * Math.PI / 128;
      const p = probabilities(interferenceState(phase));
      expect(p[0]).toBeCloseTo(Math.cos(phase / 2) ** 2, 12);
      expect(p[2]).toBeCloseTo(Math.sin(phase / 2) ** 2, 12);
      expect(p.reduce((a, b) => a + b)).toBeCloseTo(1, 12);
    }
  });
  it('the actual CZ circuit yields a Bell state; bypassing it yields an unentangled pair', () => {
    expect(fidelity(teachingPair(true), PHI_PLUS)).toBeCloseTo(1, 12);
    const p = probabilities(teachingPair(false));
    [0.5, 0, 0.5, 0].forEach((v, i) => expect(p[i]).toBeCloseTo(v, 12));
  });
  it('joint sampling respects support and Born frequencies without separate coin flips', () => {
    for (const entangle of [false, true]) {
      const s = teachingPair(entangle);
      const counts = [0, 0, 0, 0];
      for (let i = 0; i < 1000; i++) counts[samplePair(s, (i + 0.5) / 1000)]!++;
      probabilities(s).forEach((p, i) => expect(counts[i]! / 1000).toBeCloseTo(p, 12));
    }
    expect(() => samplePair(teachingPair(true), 1)).toThrow(RangeError);
  });
  it('parity checks distinguish all single bit flips without depending on the logical bit', () => {
    for (const logical of [0, 1]) {
      for (const error of [null, 0, 1, 2]) {
        const bits = [logical, logical, logical].map((b, i) => i === error ? b ^ 1 : b);
        const syndrome = [(-1) ** (bits[0]! + bits[1]!), (-1) ** (bits[1]! + bits[2]!)];
        expect(bitFlipSyndrome(error)).toEqual(syndrome);
        expect(locateBitFlip(bitFlipSyndrome(error))).toBe(error);
      }
    }
  });
});
