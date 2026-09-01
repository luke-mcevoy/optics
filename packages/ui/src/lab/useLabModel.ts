import { useMemo } from 'react';
import { propagate as propagateBench } from '@optics/bench';
import type { Bench, PropagationResult } from '@optics/bench';
import { gaussian, units } from '@optics/kernel';
import { measure } from '@optics/tools';
import { opticX, toWorld, visualRadius, wavelengthColor, wavelengthGlow } from './scale.ts';

export interface BeamSampleWorld {
  readonly zMetres: number;
  readonly x: number;
  readonly wMetres: number;
  readonly visualR: number;
  readonly Rmetres: number;
  readonly powerW: number;
}

export interface LabModel {
  readonly result: PropagationResult;
  readonly samples: readonly BeamSampleWorld[];
  readonly zMin: number;
  readonly zMax: number;
  readonly waistZ: number;
  readonly waistW: number;
  readonly waistX: number;
  readonly lambdaNm: number;
  readonly color: string;
  readonly glow: string;
  readonly powerW: number;
  readonly coupling: number | null;
}

export const useLabModel = (bench: Bench): LabModel =>
  useMemo(() => {
    const result = propagateBench(bench, 56);
    const zs = result.samples.map((sample) => units.toM(sample.z));
    const zMin = Math.min(0, ...zs);
    const zMax = Math.max(...zs, zMin + 0.02);
    const samples = result.samples.map((sample) => {
      const zMetres = units.toM(sample.z);
      const wMetres = units.toM(sample.spotRadius);
      return {
        zMetres,
        x: opticX(zMetres, zMin),
        wMetres,
        visualR: visualRadius(wMetres),
        Rmetres: units.toM(gaussian.radiusOfCurvature(sample.state.beam)),
        powerW: units.toW(sample.state.power),
      };
    });
    const waist = measure(bench, { quantity: 'waist_radius' });
    const waistPos = measure(bench, { quantity: 'waist_position' });
    const waistW = typeof waist.value === 'number' ? waist.value : units.toM(gaussian.waistRadius(result.final.beam));
    const waistZ = typeof waistPos.value === 'number' ? waistPos.value : units.toM(result.final.z);
    const fiber = result.elements.find((entry) => entry.element.type === 'fiber_smf');
    const coupling = fiber
      ? measure(bench, { quantity: 'coupling_efficiency', at: { elementId: fiber.element.id } })
      : null;
    const lambdaNm = units.toNm(bench.source.wavelength);
    return {
      result,
      samples,
      zMin,
      zMax,
      waistZ,
      waistW,
      waistX: opticX(waistZ, zMin),
      lambdaNm,
      color: wavelengthColor(lambdaNm),
      glow: wavelengthGlow(lambdaNm),
      powerW: units.toW(bench.source.power),
      coupling: typeof coupling?.value === 'number' ? coupling.value : null,
    };
  }, [bench]);

export const sampleAtX = (samples: readonly BeamSampleWorld[], x: number): BeamSampleWorld => {
  if (samples.length === 0) {
    return {
      zMetres: 0,
      x: 0,
      wMetres: 0.001,
      visualR: visualRadius(0.001),
      Rmetres: Number.POSITIVE_INFINITY,
      powerW: 0,
    };
  }
  let best = samples[0]!;
  let bestD = Math.abs(best.x - x);
  for (const sample of samples) {
    const d = Math.abs(sample.x - x);
    if (d < bestD) {
      best = sample;
      bestD = d;
    }
  }
  return best;
};

export const worldSpan = (samples: readonly BeamSampleWorld[]): { readonly minX: number; readonly maxX: number } => {
  if (samples.length === 0) return { minX: -10, maxX: 10 };
  return {
    minX: samples[0]!.x,
    maxX: samples[samples.length - 1]!.x,
  };
};

export const toWorldLength = (metres: number): number => toWorld(metres);
