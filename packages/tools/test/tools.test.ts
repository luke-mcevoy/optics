import { describe, expect, it } from 'vitest';
import {
  couplingEfficiency,
  deserializeBench,
  propagate as directPropagate,
  serializeBench,
  spotRadiusAt,
  waistAfter,
} from '@optics/bench';
import type { Bench } from '@optics/bench';
import { jones, units } from '@optics/kernel';
import {
  add_element,
  create_bench,
  explain,
  measure,
  propagate,
  remove_element,
  set_parameter,
  sweep,
  TOOL_DESCRIPTORS,
} from '../src/index.js';

const source = {
  wavelength: units.nm(780),
  waistRadius: units.mm(1.1),
  M2: 1,
  power: units.mW(1),
  polarization: jones.HORIZONTAL,
  position: units.m(0),
};

const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('agent tool surface', () => {
  it('exports descriptors for the AGENTS.md core tool operations', () => {
    expect(TOOL_DESCRIPTORS.map((descriptor) => descriptor.name)).toEqual([
      'create_bench',
      'add_element',
      'set_parameter',
      'remove_element',
      'propagate',
      'measure',
      'sweep',
      'explain',
    ]);
  });

  it('round-trips create/add/set/serialize/deserialize/propagate against the direct bench API', () => {
    const created = create_bench(source);
    const withLens = add_element(created, {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1 },
    });
    const tuned = set_parameter(withLens, 'lens', 'f', 0.04);
    const copy = deserializeBench(serializeBench(tuned));

    expect(propagate(copy)).toEqual(directPropagate(copy));
  });

  it('measure values match direct measurement calls exactly', () => {
    const bench = add_element(create_bench(source), {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.01108, T: 1 },
    });
    const withFiber = add_element(bench, {
      id: 'fiber',
      type: 'fiber_smf',
      position: 0.01108,
      params: { mfd: 5e-6 },
    });
    const result = directPropagate(withFiber);

    expect(measure(withFiber, { quantity: 'waist_radius', at: { elementId: 'lens' } }).value).toBe(
      units.toM(waistAfter(result, 'lens').radius),
    );
    expect(measure(withFiber, { quantity: 'waist_position', at: { elementId: 'lens' } }).value).toBe(
      units.toM(waistAfter(result, 'lens').z),
    );
    expect(measure(withFiber, { quantity: 'spot_radius', at: { z: 0.01108 } }).value).toBe(
      units.toM(spotRadiusAt(result, units.m(0.01108))),
    );
    expect(measure(withFiber, { quantity: 'coupling_efficiency', at: { elementId: 'fiber' } }).value).toBe(
      couplingEfficiency(result, 'fiber').efficiency,
    );
  });

  it('does not mutate input benches', () => {
    const bench = add_element(create_bench(source), {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1 },
    });

    const calls = [
      () => add_element(bench, { type: 'attenuator', position: 0.01, params: { T: 0.5 } }),
      () => set_parameter(bench, 'lens', 'f', 0.04),
      () => remove_element(bench, 'lens'),
      () => propagate(bench),
      () => measure(bench, { quantity: 'waist_radius', at: { elementId: 'lens' } }),
      () => sweep(bench, 'lens', 'f', [0.04, 0.05, 0.06]),
      () => explain(bench, 'waist_radius', { elementId: 'lens' }),
    ];

    for (const call of calls) {
      const before = snapshot(bench);
      call();
      expect(bench).toEqual(before);
    }
  });

  it('explain symbol values match measure values for the same quantity', () => {
    const bench = add_element(create_bench(source), {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1 },
    });
    const waist = measure(bench, { quantity: 'waist_radius', at: { elementId: 'lens' } });
    const explanation = explain(bench, 'waist_radius', { elementId: 'lens' });

    expect(explanation.symbols.find((symbol) => symbol.name === 'w0')?.value).toBe(waist.value);
    expect(explanation.assumptions).toContain('paraxial');
  });

  it('reports helpful error paths', () => {
    const bench = add_element(create_bench(source), {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1 },
    });

    expect(() =>
      add_element(bench, { id: 'bad', type: 'not_registered', position: 0, params: {} }),
    ).toThrow(/unknown element type "not_registered"; registered types: .*thin_lens/);
    expect(() => add_element(bench, { id: 'lens', type: 'attenuator', position: 0.01, params: { T: 1 } })).toThrow(
      /duplicate element id "lens"/,
    );
    expect(() => set_parameter(bench, 'missing', 'f', 0.04)).toThrow(/available element ids: lens/);
    expect(() => set_parameter(bench, 'lens', 'missing', 0.04)).toThrow(/available parameters: f, T|available parameters: T, f/);
  });

  it('golden north-star fiber-coupling scenario has an interior optimum above 0.9', () => {
    let bench: Bench = create_bench(source);
    bench = add_element(bench, {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.011, T: 1 },
    });
    bench = add_element(bench, {
      id: 'fiber',
      type: 'fiber_smf',
      position: 0.01108,
      params: { mfd: 5e-6 },
    });

    const points = sweep(bench, 'lens', 'f', [0.006, 0.008, 0.01, 0.01108, 0.012, 0.014, 0.016]);
    const etas = points.map((point) => {
      const coupling = point.measures.find((entry) => entry.provenance.function === 'coupling.couplingToFiber');
      expect(coupling).toBeDefined();
      return coupling?.value as number;
    });
    const max = Math.max(...etas);
    const maxIndex = etas.indexOf(max);

    expect(maxIndex).toBeGreaterThan(0);
    expect(maxIndex).toBeLessThan(etas.length - 1);
    expect(points[maxIndex]?.value).toBeCloseTo(0.01108, 4);
    expect(max).toBeGreaterThan(0.9);
  });
});
