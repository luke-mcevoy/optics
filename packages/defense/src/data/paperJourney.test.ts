import { describe, it, expect } from 'vitest';
import { PAPER_STOPS, rotatedPatch, SURFACE_RESULTS } from './paperJourney.ts';
import { PAPER } from './paper.ts';

describe('paper-specific journey', () => {
  it('covers all six main figures and gives each scene a source and an explicit model scope', () => {
    expect([...new Set(PAPER_STOPS.flatMap((s) => [...s.figures]))].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    for (const stop of PAPER_STOPS) { expect(stop.figure).toMatch(/Fig/); expect(stop.model.length).toBeGreaterThan(40); expect(stop.anchor).toMatch(/^#/); }
    expect(SURFACE_RESULTS[1].errorPct).toBe(PAPER.qec.d5LeprPct);
  });
  it('the surface-code drawing has the correct counts and commuting stabilizers', () => {
    for (const d of [3, 5] as const) {
      const { data, checks } = rotatedPatch(d);
      expect(data).toHaveLength(d * d);
      expect(checks).toHaveLength(d * d - 1);
      for (const check of checks) expect([2, 4]).toContain(check.support.length);
      for (const a of checks) for (const b of checks) {
        if (a.type !== b.type) expect(a.support.filter((s) => b.support.includes(s)).length % 2).toBe(0);
      }
    }
  });
});
