import type { Length, Misalignment } from '@optics/kernel';
import { coupling, gaussian, jones, units } from '@optics/kernel';
import type { Bench } from './schema.js';
import type { BeamState, PropagationResult } from './propagate.js';
import { cloneBenchWithParam, propagate, propagateFreeSpace } from './propagate.js';

export interface WaistMeasurement {
  readonly radius: Length;
  readonly z: Length;
  readonly stateAfterElementId: string | null;
}

export interface CouplingMeasurement {
  readonly elementId: string;
  readonly efficiency: number;
  readonly incidentPowerW: number;
  readonly coupledPowerW: number;
}

export interface SweepPoint {
  readonly value: number;
  readonly result: PropagationResult;
}

export const waistAfter = (
  result: PropagationResult,
  elementId?: string,
): WaistMeasurement => {
  const state =
    elementId === undefined
      ? result.final
      : mustFind(result.elements.find((entry) => entry.element.id === elementId), `element "${elementId}"`).after;
  return {
    radius: gaussian.waistRadius(state.beam),
    z: units.m(units.toM(state.z) + units.toM(gaussian.distanceToWaist(state.beam))),
    stateAfterElementId: elementId ?? null,
  };
};

export const spotRadiusAt = (result: PropagationResult, z: Length): Length =>
  gaussian.spotRadius(stateAt(result, z).beam);

export const powerAt = (result: PropagationResult, z: Length): number => units.toW(stateAt(result, z).power);

export const polarizationEllipseAt = (result: PropagationResult, z: Length): jones.PolarizationEllipse =>
  jones.ellipse(stateAt(result, z).jonesVector);

export const couplingEfficiency = (
  result: PropagationResult,
  fiberElementId?: string,
): CouplingMeasurement => {
  const entry =
    fiberElementId === undefined
      ? result.elements.find((state) => state.element.type === 'fiber_smf')
      : result.elements.find((state) => state.element.id === fiberElementId);
  const fiber = mustFind(entry, fiberElementId === undefined ? 'a fiber_smf element' : `element "${fiberElementId}"`);
  if (fiber.element.type !== 'fiber_smf') {
    throw new Error(`element "${fiber.element.id}" is not a fiber_smf`);
  }
  const rawMfd = fiber.element.params.mfd;
  if (typeof rawMfd !== 'number' || !(rawMfd > 0)) {
    throw new Error(`fiber_smf "${fiber.element.id}" parameter "mfd" must be a positive number in metres`);
  }
  const offset = optionalLength(fiber.element.params.offset);
  const tilt = optionalAngle(fiber.element.params.tilt);
  const misalignment: Misalignment = {};
  if (offset !== undefined) Object.assign(misalignment, { offset });
  if (tilt !== undefined) Object.assign(misalignment, { tilt });
  const eta = coupling.couplingToFiber(fiber.before.beam, units.m(rawMfd), misalignment);
  const incidentPowerW = units.toW(fiber.before.power);
  return {
    elementId: fiber.element.id,
    efficiency: eta,
    incidentPowerW,
    coupledPowerW: incidentPowerW * eta,
  };
};

export const sweep = (
  bench: Bench,
  elementId: string,
  param: string,
  values: readonly number[],
): readonly SweepPoint[] => {
  if (!bench.elements.some((element) => element.id === elementId)) {
    throw new Error(`element "${elementId}" does not exist`);
  }
  return values.map((value) => {
    if (!Number.isFinite(value)) throw new Error(`sweep value for "${param}" must be finite`);
    return { value, result: propagate(cloneBenchWithParam(bench, elementId, param, value)) };
  });
};

export const stateAt = (result: PropagationResult, z: Length): BeamState => {
  const target = units.toM(z);
  if (target < units.toM(result.input.z) - 1e-15) throw new Error('requested z is upstream of the source');
  let state = result.input;
  for (const element of result.elements) {
    if (units.toM(element.element.position) > target + 1e-15) break;
    state = element.after;
  }
  if (target < units.toM(state.z) - 1e-15) throw new Error('requested z falls before the current state');
  return propagateFreeSpace(state, z);
};

const mustFind = <T>(value: T | undefined, label: string): T => {
  if (value === undefined) throw new Error(`could not find ${label}`);
  return value;
};

const optionalLength = (value: unknown): Length | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? units.m(value) : undefined;

const optionalAngle = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? units.rad(value) : undefined;
