import { describe, expect, it } from 'vitest';
import { BENCHMARK_SCENARIOS } from '../src/eval/scenarios.js';
import { runScenarios } from '../src/eval/run.js';

describe('benchmark eval scenarios', () => {
  it('covers the v1 AGENTS.md conversations expressible with current tools', () => {
    const ids = BENCHMARK_SCENARIOS.map((scenario) => scenario.id);
    expect(ids).toEqual([
      'gaussian_focus_f50',
      'beam_expander_3x',
      'fiber_coupling_sweep',
      'qwp_circular_polarization',
      'fiber_coupling_optimum_near_design',
    ]);
  });

  it('passes all scripted scenario goldens', () => {
    const report = runScenarios();

    expect(report.ok).toBe(true);
    for (const scenario of report.scenarios) {
      expect(scenario.passed, scenario.error ?? scenario.id).toBe(true);
      for (const check of scenario.checks) {
        expect(check.passed, `${scenario.id}: ${check.label}`).toBe(true);
      }
    }
  });
});
