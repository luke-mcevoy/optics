import { describe, expect, it } from 'vitest';
import { abcd, gaussian, jones, units } from '@optics/kernel';
import type { Bench, BenchElement } from '../src/index.js';
import {
  couplingEfficiency,
  deserializeBench,
  getDefinition,
  polarizationEllipseAt,
  powerAt,
  propagate,
  registeredElements,
  serializeBench,
  spotRadiusAt,
  stateAt,
  sweep,
  waistAfter,
} from '../src/index.js';
import { mulberry32, uniform } from './rng.js';

const baseBench = (elements: readonly BenchElement[], waistRadius = units.mm(1)): Bench => ({
  source: {
    wavelength: units.nm(1064),
    waistRadius,
    M2: 1,
    power: units.mW(1),
    polarization: jones.HORIZONTAL,
    position: units.m(0),
  },
  elements,
});

describe('bench schema', () => {
  it('round-trips JSON and reports helpful validation paths', () => {
    const bench = baseBench([{ id: 'lens', type: 'thin_lens', position: units.mm(10), params: { f: 0.05 } }]);
    const copy = deserializeBench(serializeBench(bench));
    expect(copy.elements[0]?.id).toBe('lens');
    expect(() => deserializeBench('{"source":{"wavelength":1},"elements":[]}')).toThrow(/bench\.source/);
  });
});

describe('bench propagation: golden cases', () => {
  it('3x beam expander triples a collimated beam radius and stays collimated', () => {
    const result = propagate(
      baseBench([
        {
          id: 'expand',
          type: 'beam_expander',
          position: units.m(0),
          params: { f1: 0.025, f2: 0.075, T: 1 },
        },
      ]),
    );
    expect(units.toMm(gaussian.waistRadius(result.final.beam))).toBeCloseTo(3, 6);
    expect(Math.abs(result.final.beam.q.re) / result.final.beam.q.im).toBeLessThan(0.02);
    expect(units.toRad(gaussian.divergence(result.final.beam))).toBeCloseTo(
      units.toRad(gaussian.divergence(result.input.beam)) / 3,
      12,
    );
  });

  it('thin lens focusing bench reproduces the kernel golden literals', () => {
    const result = propagate(baseBench([{ id: 'lens', type: 'thin_lens', position: units.m(0), params: { f: 0.05 } }]));
    const waist = waistAfter(result, 'lens');
    expect(units.toUm(waist.radius)).toBeCloseTo(16.93166, 4);
    expect(units.toMm(waist.z)).toBeCloseTo(49.98566, 4);
  });

  it('QWP bench turns linear input circular at the detector', () => {
    const bench: Bench = {
      source: {
        wavelength: units.nm(780),
        waistRadius: units.mm(0.5),
        M2: 1,
        power: units.mW(2),
        polarization: jones.linear(units.rad(Math.PI / 4)),
        position: units.m(0),
      },
      elements: [
        { id: 'qwp', type: 'waveplate_quarter', position: units.m(0), params: { theta: 0 } },
        { id: 'detector', type: 'attenuator', position: units.mm(10), params: { T: 1 } },
      ],
    };
    const result = propagate(bench);
    const ellipse = polarizationEllipseAt(result, units.mm(10));
    expect(Math.abs(ellipse.ellipticity)).toBeCloseTo(1, 12);
    expect(Math.abs(jones.degreeOfCircularity(result.final.jonesVector))).toBeCloseTo(1, 12);
  });

  it('attenuator chain power matches the product of T', () => {
    const result = propagate(
      baseBench([
        { id: 'a', type: 'attenuator', position: units.mm(1), params: { T: 0.8 } },
        { id: 'b', type: 'attenuator', position: units.mm(2), params: { T: 0.25 } },
        { id: 'c', type: 'attenuator', position: units.mm(3), params: { T: 0.5 } },
      ]),
    );
    expect(units.toMW(result.final.power)).toBeCloseTo(0.1, 15);
    expect(powerAt(result, units.mm(2.5))).toBeCloseTo(1e-3 * 0.8 * 0.25, 15);
  });

  it('fiber coupling mode-matched gives eta near 1', () => {
    const bench: Bench = {
      source: {
        wavelength: units.nm(1550),
        waistRadius: units.um(5.2),
        M2: 1,
        power: units.mW(1),
        polarization: jones.HORIZONTAL,
        position: units.m(0),
      },
      elements: [{ id: 'fiber', type: 'fiber_smf', position: units.m(0), params: { mfd: 10.4e-6 } }],
    };
    const result = propagate(bench);
    expect(couplingEfficiency(result, 'fiber').efficiency).toBeCloseTo(1, 12);
  });

  it('sweep over lens f produces a fiber-coupling curve with an interior maximum', () => {
    const facetZ = 11.08e-3;
    const bench: Bench = {
      source: {
        wavelength: units.nm(780),
        waistRadius: units.mm(1.1),
        M2: 1,
        power: units.mW(1),
        polarization: jones.HORIZONTAL,
        position: units.m(0),
      },
      elements: [
        { id: 'lens', type: 'thin_lens', position: units.m(0), params: { f: 0.011 } },
        { id: 'fiber', type: 'fiber_smf', position: units.m(facetZ), params: { mfd: 5e-6 } },
      ],
    };
    const points = sweep(bench, 'lens', 'f', [0.006, 0.008, 0.010, 0.01108, 0.012, 0.014, 0.016]);
    const etas = points.map((point) => couplingEfficiency(point.result, 'fiber').efficiency);
    const max = Math.max(...etas);
    const maxIndex = etas.indexOf(max);
    expect(maxIndex).toBeGreaterThan(0);
    expect(maxIndex).toBeLessThan(etas.length - 1);
    expect(points[maxIndex]?.value).toBeCloseTo(0.01108, 4);
    expect(max).toBeGreaterThan(0.99);
  });
});

describe('bench propagation: properties', () => {
  it('propagate through [d1][d2] equals [d1+d2] free-space merging', () => {
    const rnd = mulberry32(0x51ace);
    for (let i = 0; i < 100; i++) {
      const d1 = uniform(rnd, 0.001, 0.2);
      const d2 = uniform(rnd, 0.001, 0.2);
      const split = propagate(
        baseBench([
          { id: 'm1', type: 'attenuator', position: units.m(d1), params: { T: 1 } },
          { id: 'm2', type: 'attenuator', position: units.m(d1 + d2), params: { T: 1 } },
        ]),
      );
      const merged = propagate(baseBench([{ id: 'm', type: 'attenuator', position: units.m(d1 + d2), params: { T: 1 } }]));
      expect(split.final.beam.q.re).toBeCloseTo(merged.final.beam.q.re, 14);
      expect(split.final.beam.q.im).toBeCloseTo(merged.final.beam.q.im, 14);
      expect(units.toW(split.final.power)).toBeCloseTo(units.toW(merged.final.power), 15);
    }
  });

  it('inserting an identity element anywhere changes nothing', () => {
    const base = baseBench([
      { id: 'lens', type: 'thin_lens', position: units.mm(20), params: { f: 0.05 } },
      { id: 'end', type: 'attenuator', position: units.mm(60), params: { T: 1 } },
    ]);
    const expected = propagate(base);
    for (const z of [0.005, 0.02, 0.04]) {
      const withIdentity = propagate({
        ...base,
        elements: [...base.elements, { id: `id-${z}`, type: 'attenuator', position: units.m(z), params: { T: 1 } }],
      });
      expect(withIdentity.final.beam.q.re).toBeCloseTo(expected.final.beam.q.re, 14);
      expect(withIdentity.final.beam.q.im).toBeCloseTo(expected.final.beam.q.im, 14);
      expect(units.toW(withIdentity.final.power)).toBeCloseTo(units.toW(expected.final.power), 15);
    }
  });

  it('element array order is ignored in favor of z-order', () => {
    const elements: readonly BenchElement[] = [
      { id: 'lens', type: 'thin_lens', position: units.mm(10), params: { f: 0.05 } },
      { id: 'att', type: 'attenuator', position: units.mm(5), params: { T: 0.7 } },
      { id: 'iris', type: 'aperture_iris', position: units.mm(20), params: { diameter: 0.01 } },
    ];
    const ordered = propagate(baseBench(elements));
    const reversed = propagate(baseBench([...elements].reverse()));
    expect(ordered.elements.map((entry) => entry.element.id)).toEqual(['att', 'lens', 'iris']);
    expect(reversed.final.beam.q.re).toBeCloseTo(ordered.final.beam.q.re, 15);
    expect(reversed.final.beam.q.im).toBeCloseTo(ordered.final.beam.q.im, 15);
    expect(units.toW(reversed.final.power)).toBeCloseTo(units.toW(ordered.final.power), 15);
  });

  it('per-element intermediate states match truncated bench propagation', () => {
    const bench = baseBench([
      { id: 'a', type: 'attenuator', position: units.mm(5), params: { T: 0.8 } },
      { id: 'lens', type: 'thin_lens', position: units.mm(10), params: { f: 0.05 } },
      { id: 'b', type: 'attenuator', position: units.mm(20), params: { T: 0.5 } },
    ]);
    const full = propagate(bench);
    for (let i = 0; i < full.elements.length; i++) {
      const truncated = propagate({ ...bench, elements: bench.elements.slice(0, i + 1) });
      const intermediate = full.elements[i]?.after;
      expect(intermediate).toBeDefined();
      expect(intermediate?.beam.q.re).toBeCloseTo(truncated.final.beam.q.re, 15);
      expect(intermediate?.beam.q.im).toBeCloseTo(truncated.final.beam.q.im, 15);
      expect(units.toW(intermediate?.power ?? units.W(0))).toBeCloseTo(units.toW(truncated.final.power), 15);
    }
  });

  it('spotRadiusAt agrees with direct stateAt propagation', () => {
    const result = propagate(baseBench([{ id: 'lens', type: 'thin_lens', position: units.mm(10), params: { f: 0.05 } }]));
    const z = units.mm(35);
    expect(units.toM(spotRadiusAt(result, z))).toBeCloseTo(units.toM(gaussian.spotRadius(stateAt(result, z).beam)), 15);
  });
});

describe('bench registry', () => {
  it('every registered default ABCD matrix has determinant 1 for same-index elements', () => {
    for (const [type, definition] of registeredElements()) {
      const params = defaultParams(type);
      const det = abcd.det(definition.abcd(params));
      expect(det, type).toBeCloseTo(1, 12);
    }
  });

  it('lossless registered elements have unitary Jones matrices when transmission is 1', () => {
    for (const [type, definition] of registeredElements()) {
      if (type === 'polarizer_linear' || type === 'pbs') continue;
      const params = defaultParams(type);
      if (definition.transmission(params) === 1) {
        expect(jones.isUnitary(definition.jones(params)), type).toBe(true);
      }
    }
  });

  it('aperture check reports pass, warning, and fail using the 2w convention', () => {
    const pass = propagate(baseBench([{ id: 'p', type: 'aperture_iris', position: units.m(0), params: { diameter: 0.003 } }]));
    const warn = propagate(baseBench([{ id: 'w', type: 'aperture_iris', position: units.m(0), params: { diameter: 0.0025 } }]));
    const fail = propagate(baseBench([{ id: 'f', type: 'aperture_iris', position: units.m(0), params: { diameter: 0.001 } }]));
    expect(pass.elements[0]?.aperture?.status).toBe('PASS');
    expect(warn.elements[0]?.aperture?.status).toBe('WARNING');
    expect(fail.elements[0]?.aperture?.status).toBe('FAIL');
  });

  it('registry lookup rejects unknown element types', () => {
    expect(() => getDefinition('not_registered')).toThrow(/unknown bench element type/);
  });
});

const defaultParams = (type: string): Record<string, number> => {
  switch (type) {
    case 'thin_lens':
      return { f: 0.05, diameter: 0.01, T: 1 };
    case 'mirror_flat':
      return { diameter: 0.01, R: 1 };
    case 'mirror_curved':
      return { R: 0.1, diameter: 0.01, R_power: 1 };
    case 'waveplate_half':
    case 'waveplate_quarter':
    case 'polarizer_linear':
    case 'pbs':
      return { theta: 0, diameter: 0.01, T: 1 };
    case 'attenuator':
      return { T: 1 };
    case 'aperture_iris':
      return { diameter: 0.01, T: 1 };
    case 'fiber_smf':
      return { mfd: 10e-6, T: 1 };
    case 'beam_expander':
      return { f1: 0.025, f2: 0.075, T: 1 };
    default:
      throw new Error(`missing default params for ${type}`);
  }
};
