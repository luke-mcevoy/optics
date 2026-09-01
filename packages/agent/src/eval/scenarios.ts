import type { JsonValue } from '@optics/bench';
import type { BenchSession } from '../executor.js';
import type { ToolExecution } from '../types.js';

export interface ScenarioStep {
  readonly name: string;
  readonly arguments: Record<string, JsonValue>;
}

export interface ScenarioGolden {
  readonly label: string;
  readonly expected: number;
  readonly rtol?: number;
  readonly atol?: number;
  readonly extract: (context: ScenarioRunContext) => number | undefined;
}

export interface EvalScenario {
  readonly id: string;
  readonly description: string;
  readonly steps: readonly ScenarioStep[];
  readonly goldens: readonly ScenarioGolden[];
}

export interface ScenarioRunContext {
  readonly session: BenchSession;
  readonly executions: readonly ToolExecution[];
}

export const BENCHMARK_SCENARIOS: readonly EvalScenario[] = [
  {
    id: 'gaussian_focus_f50',
    description: 'Collimated 1064 nm, w=1 mm focused by f=50 mm — waist position and radius',
    steps: [
      {
        name: 'create_bench',
        arguments: {
          source: {
            wavelength: 1.064e-6,
            waistRadius: 0.001,
            M2: 1,
            power: 0.001,
            polarization: { x: { re: 1, im: 0 }, y: { re: 0, im: 0 } },
            position: 0,
          },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'lens',
          type: 'thin_lens',
          position: 0,
          params: { f: 0.05, T: 1 },
        },
      },
      { name: 'propagate', arguments: {} },
      {
        name: 'measure',
        arguments: { quantity: 'waist_radius', at: { elementId: 'lens' } },
      },
      {
        name: 'measure',
        arguments: { quantity: 'waist_position', at: { elementId: 'lens' } },
      },
    ],
    goldens: [
      {
        label: 'focused waist radius (m)',
        // Hand: zR_in = pi*w^2/lambda = 2.952625 m; w0' = sqrt(lambda*zR_out/pi) = 16.93166 um
        expected: 16.93166e-6,
        rtol: 1e-3,
        extract: (ctx) => numericResult(ctx.executions[3]),
      },
      {
        label: 'waist position past lens (m)',
        // Hand: q' waist at z = -Re(q') = 49.98566 mm
        expected: 0.04998566,
        rtol: 1e-3,
        extract: (ctx) => numericResult(ctx.executions[4]),
      },
    ],
  },
  {
    id: 'beam_expander_3x',
    description: '3× Galilean beam expander triples collimated beam waist',
    steps: [
      {
        name: 'create_bench',
        arguments: {
          source: {
            wavelength: 1.064e-6,
            waistRadius: 0.001,
            M2: 1,
            power: 0.001,
            polarization: { x: { re: 1, im: 0 }, y: { re: 0, im: 0 } },
            position: 0,
          },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'expand',
          type: 'beam_expander',
          position: 0,
          params: { f1: 0.025, f2: 0.075, T: 1 },
        },
      },
      { name: 'propagate', arguments: {} },
      { name: 'measure', arguments: { quantity: 'waist_radius' } },
    ],
    goldens: [
      {
        label: 'output waist radius (m)',
        // Hand: magnification M = f2/f1 = 3; collimated w_out = M * w_in = 3 mm
        expected: 0.003,
        rtol: 1e-4,
        extract: (ctx) => numericResult(ctx.executions[3]),
      },
    ],
  },
  {
    id: 'fiber_coupling_sweep',
    description: '780 nm collimated beam through lens into SMF — focal-length sweep finds interior optimum',
    steps: [
      {
        name: 'create_bench',
        arguments: {
          source: {
            wavelength: 780e-9,
            waistRadius: 0.0011,
            M2: 1,
            power: 0.001,
            polarization: { x: { re: 1, im: 0 }, y: { re: 0, im: 0 } },
            position: 0,
          },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'lens',
          type: 'thin_lens',
          position: 0,
          params: { f: 0.011, T: 1 },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'fiber',
          type: 'fiber_smf',
          position: 0.01108,
          params: { mfd: 5e-6 },
        },
      },
      {
        name: 'sweep',
        arguments: {
          elementId: 'lens',
          param: 'f',
          values: [0.006, 0.008, 0.01, 0.01108, 0.012, 0.014, 0.016],
        },
      },
    ],
    goldens: [
      {
        label: 'peak coupling efficiency',
        // Hand: mode-matched f ≈ 11.08 mm gives η > 0.99 (kernel north-star scenario)
        expected: 0.99,
        rtol: 0.02,
        extract: (ctx) => maxSweepMeasure(ctx.executions[3], 'coupling_efficiency'),
      },
      {
        label: 'optimal focal length (m)',
        expected: 0.01108,
        rtol: 0.02,
        extract: (ctx) => argmaxSweepValue(ctx.executions[3], 'coupling_efficiency'),
      },
    ],
  },
  {
    id: 'qwp_circular_polarization',
    description: 'Horizontal linear input through QWP at 45° yields circular polarization',
    steps: [
      {
        name: 'create_bench',
        arguments: {
          source: {
            wavelength: 780e-9,
            waistRadius: 0.0005,
            M2: 1,
            power: 0.002,
            polarization: { x: { re: 1, im: 0 }, y: { re: 0, im: 0 } },
            position: 0,
          },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'qwp',
          type: 'waveplate_quarter',
          position: 0,
          params: { theta: Math.PI / 4, T: 1 },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'detector',
          type: 'attenuator',
          position: 0.01,
          params: { T: 1 },
        },
      },
      {
        name: 'measure',
        arguments: { quantity: 'polarization_ellipse', at: { z: 0.01 } },
      },
    ],
    goldens: [
      {
        label: 'polarization ellipticity magnitude',
        // Hand: QWP(45°) on horizontal linear gives equal amplitudes, 90° phase => |ellipticity| = 1
        expected: 1,
        atol: 1e-6,
        extract: (ctx) => {
          const ellipse = objectResult(ctx.executions[3]);
          const ellipticity = ellipse?.ellipticity;
          return typeof ellipticity === 'number' ? Math.abs(ellipticity) : undefined;
        },
      },
    ],
  },
  {
    id: 'fiber_coupling_optimum_near_design',
    description: 'Mode-matched 780 nm lens–fiber bench achieves high coupling at design f',
    steps: [
      {
        name: 'create_bench',
        arguments: {
          source: {
            wavelength: 780e-9,
            waistRadius: 0.0011,
            M2: 1,
            power: 0.001,
            polarization: { x: { re: 1, im: 0 }, y: { re: 0, im: 0 } },
            position: 0,
          },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'lens',
          type: 'thin_lens',
          position: 0,
          params: { f: 0.01108, T: 1 },
        },
      },
      {
        name: 'add_element',
        arguments: {
          id: 'fiber',
          type: 'fiber_smf',
          position: 0.01108,
          params: { mfd: 5e-6 },
        },
      },
      {
        name: 'measure',
        arguments: { quantity: 'coupling_efficiency', at: { elementId: 'fiber' } },
      },
    ],
    goldens: [
      {
        label: 'coupling efficiency at design focal length',
        // Hand: w0 ≈ MFD/2 at fiber facet => η ≈ 1 for Gaussian overlap
        expected: 0.99,
        rtol: 0.02,
        extract: (ctx) => numericResult(ctx.executions[3]),
      },
    ],
  },
];

const numericResult = (execution: ToolExecution | undefined): number | undefined => {
  if (execution === undefined || !execution.ok || typeof execution.result !== 'number') return undefined;
  return execution.result;
};

const objectResult = (execution: ToolExecution | undefined): Record<string, JsonValue> | undefined => {
  if (execution === undefined || !execution.ok) return undefined;
  if (typeof execution.result !== 'object' || execution.result === null || Array.isArray(execution.result)) {
    return undefined;
  }
  return execution.result as Record<string, JsonValue>;
};

interface SweepRow {
  readonly value: number;
  readonly measures: Record<string, number>;
}

const readSweepRows = (execution: ToolExecution | undefined): readonly SweepRow[] => {
  if (execution === undefined || !execution.ok || !Array.isArray(execution.result)) return [];
  return execution.result.flatMap((row) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return [];
    const value = (row as { value?: unknown }).value;
    const measures = (row as { measures?: unknown }).measures;
    if (typeof value !== 'number' || typeof measures !== 'object' || measures === null || Array.isArray(measures)) {
      return [];
    }
    const numericMeasures = Object.fromEntries(
      Object.entries(measures).flatMap(([key, measureValue]) =>
        typeof measureValue === 'number' ? [[key, measureValue]] : [],
      ),
    );
    return [{ value, measures: numericMeasures }];
  });
};

const maxSweepMeasure = (execution: ToolExecution | undefined, key: string): number | undefined => {
  const rows = readSweepRows(execution);
  const values = rows.map((row) => row.measures[key]).filter((value): value is number => typeof value === 'number');
  return values.length > 0 ? Math.max(...values) : undefined;
};

const argmaxSweepValue = (execution: ToolExecution | undefined, key: string): number | undefined => {
  const rows = readSweepRows(execution);
  let bestValue: number | undefined;
  let bestMeasure = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    const measure = row.measures[key];
    if (typeof measure !== 'number' || measure <= bestMeasure) continue;
    bestMeasure = measure;
    bestValue = row.value;
  }
  return bestValue;
};

export const matchesGolden = (
  actual: number,
  expected: number,
  rtol = 1e-6,
  atol = 0,
): boolean => Math.abs(actual - expected) <= Math.max(atol, rtol * Math.abs(expected));
