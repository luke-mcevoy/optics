import { describe, expect, it } from 'vitest';
import * as p from '../src/power.js';
import { mW, toMW, toW, W } from '../src/units.js';
import { mulberry32, uniform } from './rng.js';

describe('power: golden — itemized passive power budget', () => {
  it('computes total output and per-stage losses from hand-checked transmissions', () => {
    // Hand check:
    //   P_in = 10 mW
    //   T_total = 0.92 * 0.50 * 0.80 = 0.368
    //   P_out = 10 mW * 0.368 = 3.68 mW
    //   losses: 0.80 mW, 4.60 mW, 0.92 mW
    const budget = p.powerBudget(mW(10), [
      { id: 'window', T: 0.92 },
      { id: 'splitter', T: 0.5 },
      { id: 'filter', T: 0.8 },
    ]);

    expect(budget.totalTransmission).toBeCloseTo(0.368, 15);
    expect(toMW(budget.output)).toBeCloseTo(3.68, 12);
    expect(budget.stages.map((stage) => toMW(stage.loss))).toEqual([
      expect.closeTo(0.8, 12),
      expect.closeTo(4.6, 12),
      expect.closeTo(0.92, 12),
    ]);
  });
});

describe('power: property — passive stages never increase power', () => {
  it('keeps output power <= input power for randomized T_i in [0, 1]', () => {
    const rnd = mulberry32(0x706f7765);
    for (let i = 0; i < 500; i++) {
      const pIn = W(uniform(rnd, 0, 100));
      const count = Math.floor(uniform(rnd, 0, 12));
      const stages = Array.from({ length: count }, (_, idx) => ({
        id: `stage-${idx}`,
        T: uniform(rnd, 0, 1),
      }));

      const budget = p.powerBudget(pIn, stages);
      expect(toW(budget.output)).toBeLessThanOrEqual(toW(pIn));
      expect(budget.totalTransmission).toBeGreaterThanOrEqual(0);
      expect(budget.totalTransmission).toBeLessThanOrEqual(1);
      for (const stage of budget.stages) {
        expect(toW(stage.powerOut)).toBeLessThanOrEqual(toW(stage.powerIn));
        expect(toW(stage.loss)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
