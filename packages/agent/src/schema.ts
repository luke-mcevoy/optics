import type { JsonValue } from '@optics/bench';
import { registeredElements } from '@optics/bench';
import type { ToolDefinition } from './types.js';

const measurementQuantities = [
  'waist_radius',
  'waist_position',
  'spot_radius',
  'power',
  'polarization_ellipse',
  'coupling_efficiency',
] as const;

const elementTypes = [...registeredElements().keys()].sort();

const complexSchema = {
  type: 'object',
  properties: {
    re: { type: 'number', description: 'Real part in metres' },
    im: { type: 'number', description: 'Imaginary part in metres' },
  },
  required: ['re', 'im'],
  additionalProperties: false,
} as const;

const jonesComponentSchema = {
  type: 'object',
  properties: {
    re: { type: 'number' },
    im: { type: 'number' },
  },
  required: ['re', 'im'],
  additionalProperties: false,
} as const;

const sourceSchema = {
  type: 'object',
  description:
    'Source beam in SI units. Provide exactly one of waistRadius or q. Example: 780 nm → wavelength 7.8e-7.',
  properties: {
    wavelength: { type: 'number', description: 'Vacuum wavelength in metres' },
    waistRadius: { type: 'number', description: '1/e² intensity radius in metres' },
    q: complexSchema,
    M2: { type: 'number', minimum: 1, description: 'Beam quality factor' },
    power: { type: 'number', minimum: 0, description: 'Optical power in watts' },
    polarization: {
      type: 'object',
      properties: {
        x: jonesComponentSchema,
        y: jonesComponentSchema,
      },
      required: ['x', 'y'],
      additionalProperties: false,
    },
    position: { type: 'number', description: 'Source plane position along bench axis in metres' },
  },
  required: ['wavelength', 'M2', 'power', 'polarization', 'position'],
  additionalProperties: false,
} as const;

const atSchema = {
  type: 'object',
  properties: {
    z: { type: 'number', description: 'Measurement plane position in metres' },
    elementId: { type: 'string', description: 'Measure relative to this element state' },
  },
  additionalProperties: false,
} as const;

const elementTypesDescription = `Registered element types: ${elementTypes.join(', ')}. Params are SI (metres, radians, unitless T in [0,1]).`;

const tool = (name: string, description: string, parameters: JsonValue): ToolDefinition => ({
  type: 'function',
  function: { name, description, parameters },
});

export const AGENT_TOOL_DEFINITIONS: readonly ToolDefinition[] = Object.freeze([
  tool('create_bench', 'Create an empty optical bench from a source beam.', {
    type: 'object',
    properties: { source: sourceSchema },
    required: ['source'],
    additionalProperties: false,
  }),
  tool(
    'add_element',
    `Add one optical element to the current bench. ${elementTypesDescription}`,
    {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Optional stable element id' },
        type: { type: 'string', enum: elementTypes },
        position: { type: 'number', description: 'Element position in metres' },
        params: {
          type: 'object',
          description:
            'Element parameters in SI. thin_lens: f,T[,diameter]; fiber_smf: mfd[,offset,tilt,T]; beam_expander: f1,f2,T; waveplates/polarizer: theta,T; mirror_curved: R,R_power; attenuator/aperture_iris: T or diameter as applicable.',
          additionalProperties: true,
        },
      },
      required: ['type', 'position', 'params'],
      additionalProperties: false,
    },
  ),
  tool('set_parameter', 'Change one parameter on an existing bench element.', {
    type: 'object',
    properties: {
      elementId: { type: 'string' },
      param: { type: 'string' },
      value: { description: 'New parameter value in SI units' },
    },
    required: ['elementId', 'param', 'value'],
    additionalProperties: false,
  }),
  tool('remove_element', 'Remove one element from the current bench.', {
    type: 'object',
    properties: { elementId: { type: 'string' } },
    required: ['elementId'],
    additionalProperties: false,
  }),
  tool('propagate', 'Recompute deterministic propagation through the current bench.', {
    type: 'object',
    properties: {},
    additionalProperties: false,
  }),
  tool('measure', 'Measure a grounded quantity from deterministic bench propagation.', {
    type: 'object',
    properties: {
      quantity: { type: 'string', enum: [...measurementQuantities] },
      at: atSchema,
    },
    required: ['quantity'],
    additionalProperties: false,
  }),
  tool(
    'sweep',
    'Sweep one numeric element parameter and return compact waist/coupling measurements at each value.',
    {
      type: 'object',
      properties: {
        elementId: { type: 'string' },
        param: { type: 'string' },
        values: {
          type: 'array',
          items: { type: 'number' },
          description: 'Parameter values in SI units; at most 41 points are evaluated',
        },
      },
      required: ['elementId', 'param', 'values'],
      additionalProperties: false,
    },
  ),
  tool('explain', 'Return formula data, current symbol values, and kernel assumptions for a quantity.', {
    type: 'object',
    properties: {
      quantity: { type: 'string', enum: [...measurementQuantities] },
      at: atSchema,
    },
    required: ['quantity'],
    additionalProperties: false,
  }),
]);
