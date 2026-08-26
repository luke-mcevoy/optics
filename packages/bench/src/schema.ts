import type { Complex, JonesVector, Length, Power } from '@optics/kernel';
import { complex, gaussian, jones, units } from '@optics/kernel';

export type BenchParams = Readonly<Record<string, JsonValue>>;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface BenchSource {
  readonly wavelength: Length;
  readonly waistRadius?: Length;
  readonly q?: Complex;
  readonly M2: number;
  readonly power: Power;
  readonly polarization: JonesVector;
  readonly position: Length;
}

export interface BenchElement {
  readonly id: string;
  readonly type: string;
  readonly position: Length;
  readonly params: BenchParams;
}

export interface Bench {
  readonly source: BenchSource;
  readonly elements: readonly BenchElement[];
}

export class BenchValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'BenchValidationError';
  }
}

export const createSourceBeam = (source: BenchSource): gaussian.GaussianBeam =>
  source.q !== undefined
    ? { q: source.q, lambda0: source.wavelength, n: 1, M2: source.M2 }
    : gaussian.beamFromWaist(requiredWaist(source), source.wavelength, { M2: source.M2 });

export const serializeBench = (bench: Bench): string => JSON.stringify(validateBench(bench));

export const deserializeBench = (json: string): Bench => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new BenchValidationError(`bench JSON is invalid: ${(error as Error).message}`);
  }
  return validateBench(parsed);
};

export const validateBench = (value: unknown): Bench => {
  const root = objectAt(value, 'bench');
  const source = objectAt(root.source, 'bench.source');
  const hasWaist = source.waistRadius !== undefined;
  const hasQ = source.q !== undefined;
  if (hasWaist === hasQ) {
    throw new BenchValidationError('bench.source must provide exactly one of waistRadius or q');
  }

  const bench: Bench = {
    source: {
      wavelength: positiveLength(source.wavelength, 'bench.source.wavelength'),
      ...(hasWaist
        ? { waistRadius: positiveLength(source.waistRadius, 'bench.source.waistRadius') }
        : { q: complexAt(source.q, 'bench.source.q') }),
      M2: atLeast(source.M2, 1, 'bench.source.M2'),
      power: nonNegativePower(source.power, 'bench.source.power'),
      polarization: jonesVectorAt(source.polarization, 'bench.source.polarization'),
      position: finiteLength(source.position, 'bench.source.position'),
    },
    elements: arrayAt(root.elements, 'bench.elements').map((entry, index) =>
      elementAt(entry, `bench.elements[${index}]`),
    ),
  };

  const ids = new Set<string>();
  for (const element of bench.elements) {
    if (ids.has(element.id)) throw new BenchValidationError(`duplicate element id "${element.id}"`);
    ids.add(element.id);
  }
  return bench;
};

const requiredWaist = (source: BenchSource): Length => {
  if (source.waistRadius === undefined) {
    throw new BenchValidationError('bench.source.waistRadius is required when q is absent');
  }
  return source.waistRadius;
};

const elementAt = (value: unknown, path: string): BenchElement => {
  const element = objectAt(value, path);
  return {
    id: nonEmptyString(element.id, `${path}.id`),
    type: nonEmptyString(element.type, `${path}.type`),
    position: finiteLength(element.position, `${path}.position`),
    params: paramsAt(element.params, `${path}.params`),
  };
};

const objectAt = (value: unknown, path: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BenchValidationError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
};

const arrayAt = (value: unknown, path: string): readonly unknown[] => {
  if (!Array.isArray(value)) throw new BenchValidationError(`${path} must be an array`);
  return value;
};

const numberAt = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BenchValidationError(`${path} must be a finite number`);
  }
  return value;
};

const finiteLength = (value: unknown, path: string): Length => units.m(numberAt(value, path));
const positiveLength = (value: unknown, path: string): Length => {
  const x = numberAt(value, path);
  if (!(x > 0)) throw new BenchValidationError(`${path} must be > 0 m`);
  return units.m(x);
};

const nonNegativePower = (value: unknown, path: string): Power => {
  const x = numberAt(value, path);
  if (!(x >= 0)) throw new BenchValidationError(`${path} must be >= 0 W`);
  return units.W(x);
};

const atLeast = (value: unknown, minimum: number, path: string): number => {
  const x = numberAt(value, path);
  if (!(x >= minimum)) throw new BenchValidationError(`${path} must be >= ${minimum}`);
  return x;
};

const nonEmptyString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BenchValidationError(`${path} must be a non-empty string`);
  }
  return value;
};

const complexAt = (value: unknown, path: string): Complex => {
  const z = objectAt(value, path);
  return complex.c(numberAt(z.re, `${path}.re`), numberAt(z.im, `${path}.im`));
};

const jonesVectorAt = (value: unknown, path: string): JonesVector => {
  const v = objectAt(value, path);
  return jones.jonesVector(complexAt(v.x, `${path}.x`), complexAt(v.y, `${path}.y`));
};

const paramsAt = (value: unknown, path: string): BenchParams => {
  if (value === undefined) return {};
  if (!isJson(value)) throw new BenchValidationError(`${path} must be JSON-serializable`);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BenchValidationError(`${path} must be an object`);
  }
  return value as BenchParams;
};

const isJson = (value: unknown): value is JsonValue => {
  if (value === null) return true;
  if (typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  if (typeof value === 'object') return Object.values(value).every(isJson);
  return false;
};
