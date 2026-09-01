import { getDefinition } from '@optics/bench';
import type { PropagationResult } from '@optics/bench';
import { abcd, gaussian, units } from '@optics/kernel';
import { BEAM_HEIGHT } from './scale.ts';
import type { BeamSampleWorld } from './useLabModel.ts';

export interface TracedRay {
  readonly points: readonly [number, number, number][];
}

const HEIGHTS = [-0.85, -0.55, -0.28, 0.28, 0.55, 0.85] as const;
const AZIMUTHS = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4] as const;

export const traceRayBundle = (
  result: PropagationResult,
  samples: readonly BeamSampleWorld[],
): readonly TracedRay[] => {
  const wIn = Math.max(units.toM(gaussian.spotRadius(result.input.beam)), 1e-9);
  const RIn = units.toM(gaussian.radiusOfCurvature(result.input.beam));
  const first = samples[0];
  const k = first === undefined ? 1 : first.visualR / wIn;
  const rays: TracedRay[] = [
    { points: meridianPoints(result, samples, 0, 0, 0, k) },
  ];
  for (const height of HEIGHTS) {
    const y0 = height * wIn;
    const u0 = Number.isFinite(RIn) && Math.abs(RIn) > 1e-9 ? y0 / RIn : 0;
    for (const phi of AZIMUTHS) {
      rays.push({ points: meridianPoints(result, samples, y0, u0, phi, k) });
    }
  }
  return rays;
};

const meridianPoints = (
  result: PropagationResult,
  samples: readonly BeamSampleWorld[],
  y0: number,
  u0: number,
  phi: number,
  k: number,
): readonly [number, number, number][] => {
  const points: [number, number, number][] = [];
  let y = y0;
  let u = u0;
  let z = units.toM(result.input.z);
  push(points, samples, z, y, phi, k);

  for (const entry of result.elements) {
    const zEl = units.toM(entry.element.position);
    const d = zEl - z;
    y += u * d;
    z = zEl;
    push(points, samples, z, y, phi, k);
    const next = abcd.applyToRay(getDefinition(entry.element.type).abcd(entry.element.params), y, u);
    y = next.y;
    u = next.u;
    push(points, samples, z, y, phi, k);
  }

  const zEnd = units.toM(result.final.z);
  if (zEnd > z + 1e-9) {
    y += u * (zEnd - z);
    push(points, samples, zEnd, y, phi, k);
  }
  return points;
};

const push = (
  points: [number, number, number][],
  samples: readonly BeamSampleWorld[],
  zMetres: number,
  yMetres: number,
  phi: number,
  k: number,
): void => {
  const along = sampleAtZ(samples, zMetres);
  const r = yMetres * k;
  points.push([along.x, BEAM_HEIGHT + r * Math.cos(phi), r * Math.sin(phi)]);
};

const sampleAtZ = (samples: readonly BeamSampleWorld[], zMetres: number): BeamSampleWorld => {
  if (samples.length === 0) {
    return {
      zMetres: 0,
      x: 0,
      wMetres: 0.001,
      visualR: 0.2,
      Rmetres: Number.POSITIVE_INFINITY,
      powerW: 0,
    };
  }
  let best = samples[0]!;
  let bestD = Math.abs(best.zMetres - zMetres);
  for (const sample of samples) {
    const d = Math.abs(sample.zMetres - zMetres);
    if (d < bestD) {
      best = sample;
      bestD = d;
    }
  }
  return best;
};
