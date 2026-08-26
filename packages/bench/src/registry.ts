import type { ABCD, JonesMatrix, Length } from '@optics/kernel';
import { abcd, jones, units } from '@optics/kernel';
import type { BenchParams } from './schema.js';

export interface PrimitiveElement {
  readonly type: string;
  readonly offset: Length;
  readonly params: BenchParams;
}

export interface ElementDefinition {
  readonly abcd: (params: BenchParams) => ABCD;
  readonly jones: (params: BenchParams) => JonesMatrix;
  readonly transmission: (params: BenchParams) => number;
  readonly aperture: (params: BenchParams) => Length | null;
  readonly assumes: readonly string[];
  readonly primitives?: (params: BenchParams) => readonly PrimitiveElement[];
}

const definitions = new Map<string, ElementDefinition>();

export const register = (type: string, definition: ElementDefinition): void => {
  if (type.length === 0) throw new Error('element type must be non-empty');
  if (definitions.has(type)) throw new Error(`element type "${type}" is already registered`);
  definitions.set(type, definition);
};

export const getDefinition = (type: string): ElementDefinition => {
  const definition = definitions.get(type);
  if (definition === undefined) throw new Error(`unknown bench element type "${type}"`);
  return definition;
};

export const registeredElements = (): ReadonlyMap<string, ElementDefinition> => definitions;

const numberParam = (
  params: BenchParams,
  key: string,
  options: { readonly default?: number; readonly positive?: boolean; readonly unit?: string } = {},
): number => {
  const raw = params[key] ?? options.default;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new Error(`parameter "${key}" must be a finite number${options.unit ? ` (${options.unit})` : ''}`);
  }
  if (options.positive === true && !(raw > 0)) {
    throw new Error(`parameter "${key}" must be > 0${options.unit ? ` ${options.unit}` : ''}`);
  }
  return raw;
};

const lengthParam = (params: BenchParams, key: string, options?: { readonly default?: number; readonly positive?: boolean }): Length =>
  units.m(numberParam(params, key, { ...options, unit: 'm' }));

const angleParam = (params: BenchParams, key: string, defaultValue = 0) =>
  units.rad(numberParam(params, key, { default: defaultValue, unit: 'rad' }));

const transmissionParam = (params: BenchParams, key = 'T', defaultValue = 1): number => {
  const T = numberParam(params, key, { default: defaultValue });
  if (T < 0 || T > 1) throw new Error(`parameter "${key}" must be in [0, 1]`);
  return T;
};

const optionalAperture = (params: BenchParams): Length | null =>
  params.diameter === undefined ? null : lengthParam(params, 'diameter', { positive: true });

const identity = (): ABCD => abcd.IDENTITY;
const jonesIdentity = (): JonesMatrix => jones.JONES_IDENTITY;

register('thin_lens', {
  abcd: (params) => abcd.thinLens(lengthParam(params, 'f')),
  jones: jonesIdentity,
  transmission: (params) => transmissionParam(params),
  aperture: optionalAperture,
  assumes: ['thin-lens', 'paraxial', 'ideal-surface'],
});

register('mirror_flat', {
  abcd: identity,
  jones: jonesIdentity,
  transmission: (params) => transmissionParam(params, 'R', 1),
  aperture: optionalAperture,
  assumes: ['paraxial', 'ideal-mirror', 'folded-axis'],
});

register('mirror_curved', {
  abcd: (params) => abcd.curvedMirror(lengthParam(params, 'R')),
  jones: jonesIdentity,
  transmission: (params) => transmissionParam(params, 'R_power', 1),
  aperture: optionalAperture,
  assumes: ['paraxial', 'ideal-mirror', 'folded-axis'],
});

register('waveplate_half', {
  abcd: identity,
  jones: (params) => jones.halfWavePlate(angleParam(params, 'theta')),
  transmission: (params) => transmissionParam(params),
  aperture: optionalAperture,
  assumes: ['lossless-element', 'monochromatic', 'fully-polarized'],
});

register('waveplate_quarter', {
  abcd: identity,
  jones: (params) => jones.quarterWavePlate(angleParam(params, 'theta')),
  transmission: (params) => transmissionParam(params),
  aperture: optionalAperture,
  assumes: ['lossless-element', 'monochromatic', 'fully-polarized'],
});

register('polarizer_linear', {
  abcd: identity,
  jones: (params) => jones.linearPolarizer(angleParam(params, 'theta')),
  transmission: (params) => transmissionParam(params),
  aperture: optionalAperture,
  assumes: ['ideal-polarizer', 'fully-polarized'],
});

register('pbs', {
  abcd: identity,
  jones: () => jones.pbsTransmitted(),
  transmission: (params) => transmissionParam(params),
  aperture: optionalAperture,
  assumes: ['ideal-polarizer', 'transmitted-port', 'fully-polarized'],
});

register('attenuator', {
  abcd: identity,
  jones: jonesIdentity,
  transmission: (params) => transmissionParam(params),
  aperture: optionalAperture,
  assumes: ['passive-attenuator', 'polarization-independent'],
});

register('aperture_iris', {
  abcd: identity,
  jones: jonesIdentity,
  transmission: (params) => transmissionParam(params),
  aperture: (params) => lengthParam(params, 'diameter', { positive: true }),
  assumes: ['hard-aperture', 'no-diffraction-model'],
});

register('fiber_smf', {
  abcd: identity,
  jones: jonesIdentity,
  transmission: (params) => transmissionParam(params),
  aperture: () => null,
  assumes: ['terminal-element', 'gaussian-fiber-mode', 'common-plane-overlap'],
});

register('beam_expander', {
  abcd: identity,
  jones: jonesIdentity,
  transmission: (params) => transmissionParam(params),
  aperture: () => null,
  assumes: ['compound-element', 'thin-lens', 'paraxial'],
  primitives: (params) => {
    const f1 = lengthParam(params, 'f1');
    const f2 = lengthParam(params, 'f2');
    const T = transmissionParam(params);
    const d = units.m(units.toM(f1) + units.toM(f2));
    return [
      { type: 'thin_lens', offset: units.m(0), params: { f: units.toM(f1), T: Math.sqrt(T) } },
      { type: 'thin_lens', offset: d, params: { f: units.toM(f2), T: Math.sqrt(T) } },
    ];
  },
});
