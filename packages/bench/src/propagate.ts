import type { GaussianBeam, JonesVector, Length, Power } from '@optics/kernel';
import { abcd, gaussian, jones, units } from '@optics/kernel';
import type { Bench, BenchElement, BenchParams } from './schema.js';
import { createSourceBeam, validateBench } from './schema.js';
import { getDefinition } from './registry.js';

export type ApertureStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface BeamState {
  readonly beam: GaussianBeam;
  readonly jonesVector: JonesVector;
  readonly power: Power;
  readonly wavelength: Length;
  readonly z: Length;
}

export interface ApertureCheck {
  readonly status: ApertureStatus;
  readonly beamDiameter: Length;
  readonly clearAperture: Length;
  readonly fillFraction: number;
}

export interface ElementState {
  readonly element: BenchElement;
  readonly before: BeamState;
  readonly after: BeamState;
  readonly aperture: ApertureCheck | null;
  readonly assumptions: readonly string[];
}

export interface BeamSample {
  readonly z: Length;
  readonly state: BeamState;
  readonly spotRadius: Length;
}

export interface PropagationResult {
  readonly bench: Bench;
  readonly input: BeamState;
  readonly final: BeamState;
  readonly elements: readonly ElementState[];
  readonly samples: readonly BeamSample[];
}

interface ExpandedElement extends BenchElement {
  readonly parentId?: string;
}

export const propagate = (benchInput: Bench, sampleCountPerGap = 24): PropagationResult => {
  const bench = validateBench(benchInput);
  const elements = expandedElements(bench);
  const input: BeamState = {
    beam: createSourceBeam(bench.source),
    jonesVector: jones.normalize(bench.source.polarization),
    power: bench.source.power,
    wavelength: bench.source.wavelength,
    z: bench.source.position,
  };

  let state = input;
  const elementStates: ElementState[] = [];
  const samples: BeamSample[] = [{ z: state.z, state, spotRadius: gaussian.spotRadius(state.beam) }];

  for (const element of elements) {
    if (units.toM(element.position) < units.toM(state.z) - 1e-15) {
      throw new Error(`element "${element.id}" is upstream of the current propagation state`);
    }
    samples.push(...sampleGap(state, element.position, sampleCountPerGap));
    state = propagateFreeSpace(state, element.position);
    const before = state;
    const definition = getDefinition(element.type);
    const clearAperture = definition.aperture(element.params);
    const afterJones = jones.applyJones(definition.jones(element.params), before.jonesVector);
    const polarizationFactor = jones.intensity(afterJones);
    const normalizedJones = polarizationFactor > 0 ? jones.normalize(afterJones) : afterJones;
    const T = definition.transmission(element.params);
    if (T < 0 || T > 1) throw new Error(`transmission for "${element.id}" must be in [0, 1]`);
    state = {
      beam: abcd.applyToBeam(definition.abcd(element.params), before.beam),
      jonesVector: normalizedJones,
      power: units.W(units.toW(before.power) * T * polarizationFactor),
      wavelength: before.wavelength,
      z: before.z,
    };
    elementStates.push({
      element,
      before,
      after: state,
      aperture: clearAperture === null ? null : apertureCheck(before.beam, clearAperture),
      assumptions: definition.assumes,
    });
    samples.push({ z: state.z, state, spotRadius: gaussian.spotRadius(state.beam) });
  }

  return { bench, input, final: state, elements: elementStates, samples };
};

export const propagateFreeSpace = (state: BeamState, z: Length): BeamState => ({
  ...state,
  beam: gaussian.propagate(state.beam, units.m(units.toM(z) - units.toM(state.z))),
  z,
});

const expandedElements = (bench: Bench): readonly ExpandedElement[] => {
  const out: ExpandedElement[] = [];
  for (const element of bench.elements) {
    const definition = getDefinition(element.type);
    const primitives = definition.primitives?.(element.params);
    if (primitives === undefined) {
      out.push(element);
      continue;
    }
    primitives.forEach((primitive, index) => {
      out.push({
        id: `${element.id}/${index}:${primitive.type}`,
        type: primitive.type,
        position: units.m(units.toM(element.position) + units.toM(primitive.offset)),
        params: primitive.params,
        parentId: element.id,
      });
    });
  }
  return [...out].sort((a, b) => units.toM(a.position) - units.toM(b.position) || a.id.localeCompare(b.id));
};

const sampleGap = (from: BeamState, toZ: Length, count: number): readonly BeamSample[] => {
  const z0 = units.toM(from.z);
  const z1 = units.toM(toZ);
  if (z1 === z0) return [];
  const n = Math.max(1, count);
  const samples: BeamSample[] = [];
  for (let i = 1; i <= n; i++) {
    const z = units.m(z0 + ((z1 - z0) * i) / n);
    const state = propagateFreeSpace(from, z);
    samples.push({ z, state, spotRadius: gaussian.spotRadius(state.beam) });
  }
  return samples;
};

const apertureCheck = (beam: GaussianBeam, clearAperture: Length): ApertureCheck => {
  const beamDiameter = units.scale(gaussian.spotRadius(beam), 2);
  const fillFraction = units.ratio(beamDiameter, clearAperture);
  // Convention: compare the Gaussian 1/e^2 intensity diameter, 2w, to the clear aperture.
  // PASS <= 70% filled, WARNING between 70% and 100%, FAIL above the aperture.
  const status: ApertureStatus = fillFraction > 1 ? 'FAIL' : fillFraction > 0.7 ? 'WARNING' : 'PASS';
  return { status, beamDiameter, clearAperture, fillFraction };
};

export const cloneBenchWithParam = (
  bench: Bench,
  elementId: string,
  param: string,
  value: number,
): Bench => ({
  source: bench.source,
  elements: bench.elements.map((element) =>
    element.id === elementId ? { ...element, params: { ...element.params, [param]: value } } : element,
  ),
});

export const numericParam = (params: BenchParams, key: string): number => {
  const value = params[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`parameter "${key}" must be a finite number`);
  }
  return value;
};
