import type { Bench } from '@optics/bench';
import { gaussian, jones, units } from '@optics/kernel';
import { add_element, create_bench } from '@optics/tools';

export type ExperimentId = 'focus' | 'expander' | 'fiber' | 'polarize';

export interface Experiment {
  readonly id: ExperimentId;
  readonly numeral: string;
  readonly title: string;
  readonly lede: string;
  readonly build: () => Bench;
}

const sourceFromBeam = (beam: gaussian.GaussianBeam, powerW: number): Bench['source'] => ({
  wavelength: beam.lambda0,
  q: beam.q,
  M2: beam.M2,
  power: units.W(powerW),
  polarization: jones.HORIZONTAL,
  position: units.m(0),
});

export const EXPERIMENTS: readonly Experiment[] = [
  {
    id: 'focus',
    numeral: 'I',
    title: 'Gaussian focus',
    lede: 'A collimated TEM₀₀ beam through a thin lens. Watch the wavefronts: planes from the laser, then spherical after the lens, flattening at the waist.',
    build: () => {
      const beam = gaussian.beamFromWR(units.mm(1), units.m(Infinity), units.nm(1064));
      return add_element(
        add_element(create_bench(sourceFromBeam(beam, 0.005)), {
          id: 'lens',
          type: 'thin_lens',
          position: 0.02,
          params: { f: 0.05, diameter: 0.0254, T: 0.995 },
        }),
        {
          id: 'screen',
          type: 'aperture_iris',
          position: 0.14,
          params: { diameter: 0.04, T: 1 },
        },
      );
    },
  },
  {
    id: 'expander',
    numeral: 'II',
    title: 'Keplerian expander',
    lede: 'Two lenses, afocal. Wavefronts flatten again on the output — the same phase-space area, remapped.',
    build: () => {
      const beam = gaussian.beamFromWR(units.mm(0.4), units.m(Infinity), units.nm(780));
      return add_element(
        add_element(
          add_element(create_bench(sourceFromBeam(beam, 0.003)), {
            id: 'L1',
            type: 'thin_lens',
            position: 0.03,
            params: { f: 0.025, diameter: 0.0127, T: 0.995 },
          }),
          {
            id: 'L2',
            type: 'thin_lens',
            position: 0.105,
            params: { f: 0.075, diameter: 0.0254, T: 0.995 },
          },
        ),
        {
          id: 'screen',
          type: 'aperture_iris',
          position: 0.2,
          params: { diameter: 0.04, T: 1 },
        },
      );
    },
  },
  {
    id: 'fiber',
    numeral: 'III',
    title: 'Single-mode coupling',
    lede: 'Overlap of the focused Gaussian with a 5 μm MFD fiber mode. Wavefronts must be planar and the spot matched to the mode.',
    build: () => {
      const beam = gaussian.beamFromWR(units.mm(0.5), units.m(Infinity), units.nm(780));
      return add_element(
        add_element(create_bench(sourceFromBeam(beam, 0.002)), {
          id: 'asphere',
          type: 'thin_lens',
          position: 0.02,
          params: { f: 0.011, diameter: 0.006, T: 0.995 },
        }),
        {
          id: 'smf',
          type: 'fiber_smf',
          position: 0.031,
          params: { mfd: 0.000005, T: 1, offset: 0, tilt: 0 },
        },
      );
    },
  },
  {
    id: 'polarize',
    numeral: 'IV',
    title: 'Quarter-wave plate',
    lede: 'Horizontal linear through a QWP at 45°. The probe ellipse is jones.ellipse of the propagated Jones vector — circular when the retardance and angle are right.',
    build: () => {
      const beam = gaussian.beamFromWR(units.mm(0.8), units.m(Infinity), units.nm(780));
      return add_element(
        add_element(create_bench(sourceFromBeam(beam, 0.004)), {
          id: 'qwp',
          type: 'waveplate_quarter',
          position: 0.05,
          params: { theta: Math.PI / 4, diameter: 0.0254, T: 0.995 },
        }),
        {
          id: 'screen',
          type: 'aperture_iris',
          position: 0.16,
          params: { diameter: 0.03, T: 1 },
        },
      );
    },
  },
];

export const experimentById = (id: ExperimentId): Experiment =>
  EXPERIMENTS.find((entry) => entry.id === id) ?? EXPERIMENTS[0]!;
