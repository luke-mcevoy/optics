import { describe, expect, it } from 'vitest';
import type { JsonValue } from '@optics/bench';
import { BenchSession } from '../src/executor.js';

const createBenchArgs = (): JsonValue => ({
  source: {
    wavelength: 780e-9,
    waistRadius: 0.0011,
    M2: 1,
    power: 0.001,
    polarization: { x: { re: 1, im: 0 }, y: { re: 0, im: 0 } },
    position: 0,
  },
});

describe('BenchSession', () => {
  it('injects bench state across create → add → measure and notifies on change', () => {
    const benches: unknown[] = [];
    const session = new BenchSession((bench) => benches.push(bench));

    expect(session.getBench()).toBeNull();

    const created = session.execute('create_bench', createBenchArgs());
    expect(created).toEqual({ ok: true, result: { elementCount: 0, elementIds: [] } });
    expect(session.getBench()?.elements).toEqual([]);
    expect(benches).toHaveLength(1);

    const added = session.execute('add_element', {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1 },
    });
    expect(added.ok).toBe(true);
    expect(session.getBench()?.elements.map((element) => element.id)).toEqual(['lens']);

    const measured = session.execute('measure', {
      quantity: 'waist_radius',
      at: { elementId: 'lens' },
    });
    expect(measured.ok).toBe(true);
    if (measured.ok) {
      expect(typeof measured.result).toBe('number');
      expect(measured.unit).toBe('m');
      expect(measured.provenance?.function).toBe('gaussian.waistRadius');
    }
  });

  it('returns ok: false for tool errors instead of throwing', () => {
    const session = new BenchSession();
    session.execute('create_bench', createBenchArgs());
    session.execute('add_element', {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1 },
    });

    const fresh = new BenchSession();
    const missingBench = fresh.execute('measure', { quantity: 'waist_radius' });
    expect(missingBench).toEqual({ ok: false, error: 'no bench exists; call create_bench first' });

    fresh.execute('create_bench', createBenchArgs());
    const badType = fresh.execute('add_element', {
      type: 'not_registered',
      position: 0,
      params: {},
    });
    expect(badType.ok).toBe(false);
    if (!badType.ok) {
      expect(badType.error).toMatch(/unknown element type "not_registered"/);
    }
  });

  it('tolerates model noise: null optional args and echoed type inside params', () => {
    const session = new BenchSession();
    session.execute('create_bench', createBenchArgs());

    const added = session.execute('add_element', {
      id: null,
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1, diameter: null, type: 'thin_lens' },
    });
    expect(added).toEqual({ ok: true, result: { elementCount: 1, elementIds: ['thin_lens_1'] } });

    const element = session.getBench()?.elements[0];
    expect(element?.params).toEqual({ f: 0.05, T: 1 });

    const propagated = session.execute('propagate', {});
    expect(propagated.ok).toBe(true);
  });

  it('returns compact propagation and truncated sweep rows', () => {
    const session = new BenchSession();
    session.execute('create_bench', createBenchArgs());
    session.execute('add_element', {
      id: 'lens',
      type: 'thin_lens',
      position: 0,
      params: { f: 0.05, T: 1 },
    });

    const propagated = session.execute('propagate', {});
    expect(propagated.ok).toBe(true);
    if (propagated.ok) {
      expect(propagated.result).toMatchObject({
        elementCount: 1,
        finalZ: expect.any(Number),
        finalPower: expect.any(Number),
        waistRadius: expect.any(Number),
        waistPosition: expect.any(Number),
      });
    }

    const values = Array.from({ length: 50 }, (_, index) => 0.04 + index * 0.001);
    const swept = session.execute('sweep', { elementId: 'lens', param: 'f', values });
    expect(swept.ok).toBe(true);
    if (swept.ok && Array.isArray(swept.result)) {
      expect(swept.result).toHaveLength(41);
      expect(swept.result[0]).toMatchObject({
        value: expect.any(Number),
        measures: expect.objectContaining({
          waist_radius: expect.any(Number),
          waist_position: expect.any(Number),
        }),
      });
    }
  });
});
