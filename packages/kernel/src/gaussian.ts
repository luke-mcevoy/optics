/**
 * Gaussian beams — the complex q parameter.
 *
 * Convention (SESSION.md, binding):
 *
 *     1/q = 1/R - i * lambda0 * M2 / (pi * n * w^2)
 *
 * i.e. the *vacuum* wavelength lambda0, the *local* refractive index n, and
 * the beam-quality factor M2 are all folded into q. Consequences:
 *
 *   - Rayleigh range      zR = pi * n * w0^2 / (M2 * lambda0) = Im(q)
 *   - far-field half-angle theta = M2 * lambda0 / (pi * n * w0)
 *   - beam parameter product w0 * theta = M2 * lambda0 / (n * pi)
 *
 * so the beam-quality invariant is `w0*theta >= M2*lambda0/(n*pi)`, NOT a bare
 * `lambda/pi`. ABCD matrices are *unreduced* (see abcd.ts), which pairs with
 * this q so that a flat interface [[1,0],[0,n1/n2]] leaves w unchanged.
 */

import type { Complex } from './complex.js';
import { c, cAdd, cInv } from './complex.js';
import type { Angle, Length } from './units.js';
import { m, rad, toM, toRad } from './units.js';
import type { Assumption } from './assumptions.js';
import { HOMOGENEOUS_MEDIUM, MONOCHROMATIC, PARAXIAL, SCALAR, TEM00 } from './assumptions.js';

export const ASSUMPTIONS: readonly Assumption[] = Object.freeze([
  PARAXIAL,
  TEM00,
  SCALAR,
  MONOCHROMATIC,
  HOMOGENEOUS_MEDIUM,
]);

/**
 * A Gaussian beam at one plane. `q` is in metres; `lambda0` is the vacuum
 * wavelength; `n` is the index of the medium the beam is currently in.
 */
export interface GaussianBeam {
  /** Complex beam parameter at this plane, in metres. */
  readonly q: Complex;
  /** Vacuum wavelength. */
  readonly lambda0: Length;
  /** Refractive index of the local medium. */
  readonly n: number;
  /** Beam-quality factor, M2 >= 1. */
  readonly M2: number;
}

export interface BeamOptions {
  /** Refractive index of the local medium (default 1). */
  readonly n?: number;
  /** Beam-quality factor (default 1). */
  readonly M2?: number;
}

const optsOf = (o: BeamOptions | undefined): { n: number; M2: number } => {
  const n = o?.n ?? 1;
  const M2 = o?.M2 ?? 1;
  if (!(n > 0)) throw new Error(`refractive index must be positive, got ${n}`);
  if (!(M2 >= 1)) throw new Error(`M2 must be >= 1, got ${M2}`);
  return { n, M2 };
};

/** lambda0 * M2 / (pi * n) — the "effective" beam constant appearing in q. */
const beamConstant = (beam: Pick<GaussianBeam, 'lambda0' | 'n' | 'M2'>): number =>
  (toM(beam.lambda0) * beam.M2) / (Math.PI * beam.n);

/**
 * Build a beam from its waist radius, at a signed distance `z` from the waist
 * (positive = downstream of the waist). q = z + i*zR.
 */
export const beamFromWaist = (
  w0: Length,
  lambda0: Length,
  options?: BeamOptions,
  z: Length = m(0),
): GaussianBeam => {
  const { n, M2 } = optsOf(options);
  if (!(toM(w0) > 0)) throw new Error('waist radius must be positive');
  const zR = (Math.PI * n * toM(w0) ** 2) / (M2 * toM(lambda0));
  return { q: c(toM(z), zR), lambda0, n, M2 };
};

/**
 * Build a beam from the local spot radius `w` and wavefront radius of
 * curvature `R` (use `Infinity` for a flat wavefront / collimated beam).
 * R > 0 means a diverging beam (centre of curvature upstream).
 */
export const beamFromWR = (
  w: Length,
  R: Length,
  lambda0: Length,
  options?: BeamOptions,
): GaussianBeam => {
  const { n, M2 } = optsOf(options);
  if (!(toM(w) > 0)) throw new Error('spot radius must be positive');
  const invR = Number.isFinite(toM(R)) ? 1 / toM(R) : 0;
  const imag = -(toM(lambda0) * M2) / (Math.PI * n * toM(w) ** 2);
  return { q: cInv(c(invR, imag)), lambda0, n, M2 };
};

/** Spot radius w (1/e^2 intensity) at the beam's current plane. */
export const spotRadius = (beam: GaussianBeam): Length => {
  const inv = cInv(beam.q);
  if (!(inv.im < 0)) throw new Error('invalid q: Im(1/q) must be negative for a physical beam');
  return m(Math.sqrt(-beamConstant(beam) / inv.im));
};

/** Wavefront radius of curvature R at the current plane; Infinity at a waist. */
export const radiusOfCurvature = (beam: GaussianBeam): Length => {
  const inv = cInv(beam.q);
  return m(inv.re === 0 ? Infinity : 1 / inv.re);
};

/** Rayleigh range zR = Im(q). */
export const rayleighRange = (beam: GaussianBeam): Length => m(beam.q.im);

/** Waist radius w0 = sqrt(M2*lambda0*zR/(pi*n)). */
export const waistRadius = (beam: GaussianBeam): Length =>
  m(Math.sqrt(beamConstant(beam) * beam.q.im));

/**
 * Signed distance from the current plane to the waist, positive when the waist
 * lies downstream. Equals -Re(q).
 */
export const distanceToWaist = (beam: GaussianBeam): Length => m(-beam.q.re);

/** Signed distance from the waist to the current plane, z = Re(q). */
export const zFromWaist = (beam: GaussianBeam): Length => m(beam.q.re);

/** Far-field half-angle theta = M2*lambda0/(pi*n*w0). */
export const divergence = (beam: GaussianBeam): Angle =>
  rad(beamConstant(beam) / toM(waistRadius(beam)));

/** Gouy phase psi = atan(z/zR), zero at the waist. */
export const gouyPhase = (beam: GaussianBeam): Angle => rad(Math.atan2(beam.q.re, beam.q.im));

/** Wavenumber in the local medium, k = 2*pi*n/lambda0 (rad/m). */
export const wavenumber = (beam: Pick<GaussianBeam, 'lambda0' | 'n'>): number =>
  (2 * Math.PI * beam.n) / toM(beam.lambda0);

/** On-axis intensity for a given total power: I0 = 2P/(pi w^2). */
export const peakIntensity = (beam: GaussianBeam, powerW: number): number =>
  (2 * powerW) / (Math.PI * toM(spotRadius(beam)) ** 2);

/** Free-space propagation by distance d in the current medium: q -> q + d. */
export const propagate = (beam: GaussianBeam, d: Length): GaussianBeam => ({
  ...beam,
  q: cAdd(beam.q, c(toM(d), 0)),
});

/** Spot radius at a signed distance d from the beam's current plane. */
export const spotRadiusAt = (beam: GaussianBeam, d: Length): Length =>
  spotRadius(propagate(beam, d));

/** Move the beam to its own waist plane (q becomes purely imaginary). */
export const atWaist = (beam: GaussianBeam): GaussianBeam =>
  propagate(beam, distanceToWaist(beam));

/**
 * Beam parameter product w0*theta. By the convention above this is exactly
 * M2*lambda0/(n*pi) for an ideal Gaussian, and can never be smaller.
 */
export const beamParameterProduct = (beam: GaussianBeam): number =>
  toM(waistRadius(beam)) * toRad(divergence(beam));
