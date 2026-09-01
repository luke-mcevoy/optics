import type {
  Bench,
  BenchElement,
  BenchParams,
  JsonValue,
  PropagationResult,
} from '@optics/bench';
import {
  couplingEfficiency as benchCouplingEfficiency,
  getDefinition,
  polarizationEllipseAt,
  powerAt,
  propagate as benchPropagate,
  registeredElements,
  spotRadiusAt,
  sweep as benchSweep,
  validateBench,
  waistAfter,
} from '@optics/bench';
import { KERNEL_ASSUMPTIONS, units } from '@optics/kernel';
import type { Assumption, Length, PolarizationEllipse } from '@optics/kernel';

export type MeasurementQuantity =
  | 'waist_radius'
  | 'waist_position'
  | 'spot_radius'
  | 'power'
  | 'polarization_ellipse'
  | 'coupling_efficiency';

export interface ToolAt {
  readonly z?: number;
  readonly elementId?: string;
}

export interface AddElementInput {
  readonly id?: string;
  readonly type: string;
  readonly position: number;
  readonly params: BenchParams;
}

export interface Provenance {
  readonly package: '@optics/kernel' | '@optics/bench';
  readonly function: string;
  readonly inputs: JsonValue;
}

export interface Measurement {
  readonly value: JsonValue;
  readonly unit: string;
  readonly provenance: Provenance;
}

export interface SweepMeasurementPoint {
  readonly value: number;
  readonly measures: readonly Measurement[];
}

export interface ExplanationSymbol {
  readonly name: string;
  readonly value: JsonValue;
  readonly unit: string;
}

export interface Explanation {
  readonly formula: string;
  readonly symbols: readonly ExplanationSymbol[];
  readonly assumptions: readonly string[];
}

export interface ToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonValue;
}

export const create_bench = (source: Bench['source']): Bench =>
  validateBench({ source, elements: [] });

export const add_element = (bench: Bench, input: AddElementInput): Bench => {
  const base = validateBench(bench);
  assertRegisteredType(input.type);
  const id = input.id ?? nextElementId(base, input.type);
  if (base.elements.some((element) => element.id === id)) {
    throw new Error(`duplicate element id "${id}"`);
  }
  const next: Bench = {
    source: base.source,
    elements: [
      ...base.elements,
      {
        id,
        type: input.type,
        position: units.m(input.position),
        params: input.params,
      },
    ],
  };
  return validateBench(next);
};

export const set_parameter = (
  bench: Bench,
  elementId: string,
  param: string,
  value: JsonValue,
): Bench => {
  const base = validateBench(bench);
  const element = mustFindElement(base, elementId);
  if (!Object.prototype.hasOwnProperty.call(element.params, param)) {
    const available = Object.keys(element.params).sort();
    throw new Error(
      `element "${elementId}" has no parameter "${param}"` +
        (available.length > 0 ? `; available parameters: ${available.join(', ')}` : '; it has no parameters'),
    );
  }
  return validateBench({
    source: base.source,
    elements: base.elements.map((entry) =>
      entry.id === elementId ? { ...entry, params: { ...entry.params, [param]: value } } : entry,
    ),
  });
};

export const remove_element = (bench: Bench, elementId: string): Bench => {
  const base = validateBench(bench);
  mustFindElement(base, elementId);
  return validateBench({
    source: base.source,
    elements: base.elements.filter((element) => element.id !== elementId),
  });
};

export const propagate = (bench: Bench): PropagationResult => benchPropagate(validateBench(bench));

export const measure = (
  bench: Bench,
  input: { readonly quantity: MeasurementQuantity; readonly at?: ToolAt },
): Measurement => {
  const result = propagate(bench);
  const at = input.at ?? {};
  switch (input.quantity) {
    case 'waist_radius': {
      const waist = waistAfter(result, at.elementId);
      return measurement(units.toM(waist.radius), 'm', 'gaussian.waistRadius', {
        elementId: at.elementId ?? null,
        q: selectedWaistQ(result, at.elementId),
      });
    }
    case 'waist_position': {
      const waist = waistAfter(result, at.elementId);
      return measurement(units.toM(waist.z), 'm', 'gaussian.distanceToWaist', {
        elementId: at.elementId ?? null,
        stateZ: selectedStateZ(result, at.elementId),
        q: selectedWaistQ(result, at.elementId),
      });
    }
    case 'spot_radius': {
      const z = requiredZ(at, input.quantity);
      return measurement(units.toM(spotRadiusAt(result, z)), 'm', 'gaussian.spotRadius', { z: units.toM(z) });
    }
    case 'power': {
      const z = requiredZ(at, input.quantity);
      return measurement(powerAt(result, z), 'W', 'power.multiplicativeBudget', { z: units.toM(z) });
    }
    case 'polarization_ellipse': {
      const z = requiredZ(at, input.quantity);
      return measurement(ellipseJson(polarizationEllipseAt(result, z)), 'dimensionless', 'jones.ellipse', {
        z: units.toM(z),
      });
    }
    case 'coupling_efficiency': {
      const coupling = benchCouplingEfficiency(result, at.elementId);
      return measurement(coupling.efficiency, '1', 'coupling.couplingToFiber', {
        fiberElementId: coupling.elementId,
        incidentPowerW: coupling.incidentPowerW,
      });
    }
  }
};

export const sweep = (
  bench: Bench,
  elementId: string,
  param: string,
  values: readonly number[],
): readonly SweepMeasurementPoint[] => {
  const base = validateBench(bench);
  mustFindElement(base, elementId);
  if (!Object.prototype.hasOwnProperty.call(mustFindElement(base, elementId).params, param)) {
    throw new Error(`element "${elementId}" has no parameter "${param}"`);
  }
  return benchSweep(base, elementId, param, values).map((point) => ({
    value: point.value,
    measures: sweepMeasures(point.result.bench),
  }));
};

export const explain = (bench: Bench, quantity: MeasurementQuantity, at: ToolAt = {}): Explanation => {
  const result = propagate(bench);
  switch (quantity) {
    case 'waist_radius': {
      const waist = waistAfter(result, at.elementId);
      return {
        formula: 'w0 = sqrt(M2 * lambda0 * Im(q) / (pi * n))',
        symbols: [
          symbol('w0', units.toM(waist.radius), 'm'),
          symbol('M2', selectedBeam(result, at.elementId).M2, '1'),
          symbol('lambda0', units.toM(selectedBeam(result, at.elementId).lambda0), 'm'),
          symbol('Im(q)', selectedBeam(result, at.elementId).q.im, 'm'),
          symbol('n', selectedBeam(result, at.elementId).n, '1'),
        ],
        assumptions: assumptionIds(kernelAssumptions('gaussian')),
      };
    }
    case 'waist_position': {
      const waist = waistAfter(result, at.elementId);
      return {
        formula: 'z_waist = z_state - Re(q)',
        symbols: [
          symbol('z_waist', units.toM(waist.z), 'm'),
          symbol('z_state', units.toM(selectedState(result, at.elementId).z), 'm'),
          symbol('Re(q)', selectedBeam(result, at.elementId).q.re, 'm'),
        ],
        assumptions: assumptionIds(kernelAssumptions('gaussian')),
      };
    }
    case 'spot_radius': {
      const z = requiredZ(at, quantity);
      const value = measure(bench, { quantity, at }).value;
      return {
        formula: 'w(z) = sqrt(-(lambda0 * M2) / (pi * n * Im(1/q(z))))',
        symbols: [
          symbol('w(z)', value, 'm'),
          symbol('z', units.toM(z), 'm'),
          symbol('lambda0', units.toM(result.input.beam.lambda0), 'm'),
          symbol('M2', result.input.beam.M2, '1'),
          symbol('n', result.input.beam.n, '1'),
        ],
        assumptions: assumptionIds(kernelAssumptions('gaussian')),
      };
    }
    case 'power': {
      const z = requiredZ(at, quantity);
      const value = measure(bench, { quantity, at }).value;
      return {
        formula: 'P(z) = P_source * product(T_i * polarization_factor_i)',
        symbols: [
          symbol('P(z)', value, 'W'),
          symbol('z', units.toM(z), 'm'),
          symbol('P_source', units.toW(result.input.power), 'W'),
        ],
        assumptions: assumptionIds(kernelAssumptions('power')),
      };
    }
    case 'polarization_ellipse': {
      const z = requiredZ(at, quantity);
      const measured = measure(bench, { quantity, at }).value;
      return {
        formula: 'orientation = 1/2 atan2(S2, S1); ellipticity_angle = 1/2 asin(S3 / S0)',
        symbols: [symbol('ellipse', measured, 'dimensionless'), symbol('z', units.toM(z), 'm')],
        assumptions: assumptionIds(kernelAssumptions('jones')),
      };
    }
    case 'coupling_efficiency': {
      const coupling = benchCouplingEfficiency(result, at.elementId);
      const fiber = result.elements.find((entry) => entry.element.id === coupling.elementId)?.element;
      return {
        formula: 'eta = couplingToFiber(incident_gaussian_q, MFD, offset, tilt)',
        symbols: [
          symbol('eta', coupling.efficiency, '1'),
          symbol('incident_power', coupling.incidentPowerW, 'W'),
          symbol('coupled_power', coupling.coupledPowerW, 'W'),
          symbol('MFD', requiredNumber(fiber?.params.mfd, `fiber_smf "${coupling.elementId}" parameter "mfd"`), 'm'),
          symbol('offset', optionalNumber(fiber?.params.offset, 0), 'm'),
          symbol('tilt', optionalNumber(fiber?.params.tilt, 0), 'rad'),
        ],
        assumptions: assumptionIds(kernelAssumptions('coupling')),
      };
    }
  }
};

const sourceShape = {
  wavelength: 'number metres',
  waistRadius: 'optional number metres; mutually exclusive with q',
  q: 'optional { re: number metres, im: number metres }; mutually exclusive with waistRadius',
  M2: 'number >= 1',
  power: 'number watts',
  polarization: '{ x: { re: number, im: number }, y: { re: number, im: number } }',
  position: 'number metres',
} as const;

const benchShape = {
  source: sourceShape,
  elements: [{ id: 'string', type: 'string', position: 'number metres', params: 'object' }],
} as const;

export const TOOL_DESCRIPTORS: readonly ToolDescriptor[] = Object.freeze([
  descriptor('create_bench', 'Create an empty optical bench from a source beam.', {
    source: sourceShape,
  }),
  descriptor('add_element', 'Return a new bench with one optical element added.', {
    bench: benchShape,
    element: { id: 'optional string', type: 'string', position: 'number metres', params: 'object' },
  }),
  descriptor('set_parameter', 'Return a new bench with one existing element parameter changed.', {
    bench: benchShape,
    elementId: 'string',
    param: 'string',
    value: 'JSON value',
  }),
  descriptor('remove_element', 'Return a new bench with one element removed.', {
    bench: benchShape,
    elementId: 'string',
  }),
  descriptor('propagate', 'Run deterministic propagation through the bench.', { bench: benchShape }),
  descriptor('measure', 'Measure a grounded quantity from deterministic bench propagation.', {
    bench: benchShape,
    quantity: ['waist_radius', 'waist_position', 'spot_radius', 'power', 'polarization_ellipse', 'coupling_efficiency'],
    at: { z: 'optional number metres', elementId: 'optional string' },
  }),
  descriptor('sweep', 'Sweep one numeric element parameter and measure coupling efficiency at each point.', {
    bench: benchShape,
    elementId: 'string',
    param: 'string',
    values: 'number[]',
  }),
  descriptor('explain', 'Return formula data, current symbols, and kernel assumptions for a quantity.', {
    bench: benchShape,
    quantity: ['waist_radius', 'waist_position', 'spot_radius', 'power', 'polarization_ellipse', 'coupling_efficiency'],
    at: { z: 'optional number metres', elementId: 'optional string' },
  }),
]);

const measurement = (value: JsonValue, unit: string, fn: string, inputs: JsonValue): Measurement => ({
  value,
  unit,
  provenance: { package: fn.startsWith('power.') ? '@optics/bench' : '@optics/kernel', function: fn, inputs },
});

const symbol = (name: string, value: JsonValue, unit: string): ExplanationSymbol => ({ name, value, unit });

function descriptor(name: string, description: string, parameters: JsonValue): ToolDescriptor {
  return { name, description, parameters };
}

const availableTypes = (): string => [...registeredElements().keys()].sort().join(', ');

const assertRegisteredType = (type: string): void => {
  try {
    getDefinition(type);
  } catch {
    throw new Error(`unknown element type "${type}"; registered types: ${availableTypes()}`);
  }
};

const nextElementId = (bench: Bench, type: string): string => {
  let index = 1;
  let id = `${type}_${index}`;
  const ids = new Set(bench.elements.map((element) => element.id));
  while (ids.has(id)) {
    index += 1;
    id = `${type}_${index}`;
  }
  return id;
};

const mustFindElement = (bench: Bench, elementId: string): BenchElement => {
  const element = bench.elements.find((entry) => entry.id === elementId);
  if (element === undefined) {
    const ids = bench.elements.map((entry) => entry.id).sort();
    throw new Error(
      `element "${elementId}" does not exist` +
        (ids.length > 0 ? `; available element ids: ${ids.join(', ')}` : '; bench has no elements'),
    );
  }
  return element;
};

const requiredZ = (at: ToolAt, quantity: MeasurementQuantity): Length => {
  if (typeof at.z !== 'number' || !Number.isFinite(at.z)) {
    throw new Error(`measure(${quantity}) requires at.z as a finite number in metres`);
  }
  return units.m(at.z);
};

const selectedState = (result: PropagationResult, elementId?: string) =>
  elementId === undefined
    ? result.final
    : result.elements.find((entry) => entry.element.id === elementId)?.after ??
      (() => {
        // Compound elements expand into primitives during propagation, so the
        // id the caller placed may not exist here; list what does.
        const ids = result.elements.map((entry) => entry.element.id).sort();
        throw new Error(
          `element "${elementId}" does not exist in the propagated bench` +
            (ids.length > 0 ? `; propagated element ids: ${ids.join(', ')}` : ''),
        );
      })();

const selectedBeam = (result: PropagationResult, elementId?: string) => selectedState(result, elementId).beam;

const selectedWaistQ = (result: PropagationResult, elementId?: string): JsonValue => {
  const q = selectedBeam(result, elementId).q;
  return { re: q.re, im: q.im };
};

const selectedStateZ = (result: PropagationResult, elementId?: string): number =>
  units.toM(selectedState(result, elementId).z);

const ellipseJson = (ellipse: PolarizationEllipse): JsonValue => ({
  orientation: units.toRad(ellipse.orientation),
  ellipticityAngle: units.toRad(ellipse.ellipticityAngle),
  ellipticity: ellipse.ellipticity,
  handedness: ellipse.handedness,
});

const assumptionIds = (assumptions: readonly Assumption[]): readonly string[] =>
  assumptions.map((assumption) => assumption.id);

const kernelAssumptions = (module: string): readonly Assumption[] => KERNEL_ASSUMPTIONS[module] ?? [];

const requiredNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
};

const optionalNumber = (value: unknown, defaultValue: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;

const sweepMeasures = (bench: Bench): readonly Measurement[] => {
  const result = propagate(bench);
  const measures: Measurement[] = [
    measure(result.bench, { quantity: 'waist_radius' }),
    measure(result.bench, { quantity: 'waist_position' }),
  ];
  if (result.elements.some((entry) => entry.element.type === 'fiber_smf')) {
    measures.push(measure(result.bench, { quantity: 'coupling_efficiency' }));
  }
  return measures;
};
