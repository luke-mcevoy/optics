/**
 * Fiber coupling — mode-overlap of two Gaussian fields at a common plane.
 *
 * Closed form (SESSION.md, binding). Exact for paraxial Gaussians with
 * arbitrary complex q1, q2 evaluated at one plane, with lateral offset x0 and
 * angular tilt theta of the incident beam relative to the fiber mode. With
 * k = 2*pi*n/lambda0:
 *
 *     eta0 = 4 * Im(1/q1) * Im(1/q2) / |1/q1 - conj(1/q2)|^2
 *     A    = i*k/2 * (1/q1 - conj(1/q2))
 *     b    = i*k * (x0/q1 + theta)
 *     eta  = eta0 * exp( 2 * Re[ b^2/(4A) - i*k*x0^2/(2*q1) ] )
 *
 * The *general complex q* matters: during a focal-length sweep the beam at the
 * facet is not at its waist, so the two-waist formula does not apply. The
 * reductions (two waists; Marcuse's offset/tilt formulas) are golden tests.
 *
 * eta is a power coupling efficiency in [0, 1]: the fraction of incident power
 * that lands in the fiber's fundamental mode.
 */

import type { Complex } from './complex.js';
import { c, cAbs2, cDiv, cInv, cMul, cSub, cConj, cScale } from './complex.js';
import type { GaussianBeam } from './gaussian.js';
import { beamFromWaist, wavenumber } from './gaussian.js';
import type { Angle, Length } from './units.js';
import { m, rad, scale, toM, toRad } from './units.js';
import type { Assumption } from './assumptions.js';
import {
  COMMON_PLANE_OVERLAP,
  GAUSSIAN_FIBER_MODE,
  MONOCHROMATIC,
  PARAXIAL,
  SCALAR,
  TEM00,
} from './assumptions.js';

export const ASSUMPTIONS: readonly Assumption[] = Object.freeze([
  PARAXIAL,
  TEM00,
  SCALAR,
  GAUSSIAN_FIBER_MODE,
  COMMON_PLANE_OVERLAP,
  MONOCHROMATIC,
]);

export interface Misalignment {
  /** Lateral offset of the incident beam from the fiber axis. */
  readonly offset?: Length;
  /** Angular tilt of the incident beam relative to the fiber axis. */
  readonly tilt?: Angle;
}

/**
 * Fundamental mode of a step-index single-mode fiber, as a Gaussian of waist
 * w0 = MFD/2 located at the fiber facet.
 */
export const fiberModeFromMFD = (
  mfd: Length,
  lambda0: Length,
  options?: { readonly n?: number },
): GaussianBeam => beamFromWaist(scale(mfd, 0.5), lambda0, { n: options?.n ?? 1, M2: 1 }, m(0));

/** Mode-field radius w0 = MFD/2. */
export const modeFieldRadius = (mfd: Length): Length => scale(mfd, 0.5);

/**
 * Power coupling efficiency between an incident beam and a target mode, both
 * evaluated at the same transverse plane (the fiber facet).
 */
export const couplingEfficiency = (
  incident: GaussianBeam,
  mode: GaussianBeam,
  misalignment: Misalignment = {},
): number => {
  if (Math.abs(toM(incident.lambda0) - toM(mode.lambda0)) > 1e-18) {
    throw new Error('incident beam and fiber mode must share a vacuum wavelength');
  }
  if (Math.abs(incident.n - mode.n) > 1e-12) {
    throw new Error('incident beam and fiber mode must be evaluated in the same medium');
  }

  const k = wavenumber(incident);
  const x0 = toM(misalignment.offset ?? m(0));
  const theta = toRad(misalignment.tilt ?? rad(0));

  const q1 = incident.q;
  const inv1: Complex = cInv(q1);
  const inv2: Complex = cInv(mode.q);

  if (!(inv1.im < 0 && inv2.im < 0)) {
    throw new Error('invalid q: Im(1/q) must be negative for both fields');
  }

  // eta0 = 4 Im(1/q1) Im(1/q2) / |1/q1 - conj(1/q2)|^2
  const diff = cSub(inv1, cConj(inv2));
  const denom = cAbs2(diff);
  if (denom === 0) throw new Error('degenerate overlap: |1/q1 - conj(1/q2)| = 0');
  const eta0 = (4 * inv1.im * inv2.im) / denom;

  // A = i k/2 (1/q1 - conj(1/q2));  b = i k (x0/q1 + theta)
  const A = cMul(c(0, k / 2), diff);
  const b = cMul(c(0, k), c(inv1.re * x0 + theta, inv1.im * x0));

  // exponent = 2 Re[ b^2/(4A) - i k x0^2/(2 q1) ]
  const term1 = cDiv(cMul(b, b), cScale(A, 4));
  const term2 = cMul(c(0, -(k * x0 * x0) / 2), inv1);
  const exponent = 2 * (term1.re + term2.re);

  const eta = eta0 * Math.exp(exponent);
  // Returned raw, not clamped: the closed form is bounded by 1 analytically,
  // so an excursion beyond rounding error means a bug, not a physical result.
  if (!Number.isFinite(eta) || eta < 0 || eta > 1 + 1e-9) {
    throw new Error(`coupling efficiency out of range (${eta}) — numerically invalid inputs`);
  }
  return eta;
};

/**
 * Coupling into a fiber specified by its mode-field diameter, for a beam
 * already propagated to the facet plane.
 */
export const couplingToFiber = (
  incident: GaussianBeam,
  mfd: Length,
  misalignment: Misalignment = {},
): number =>
  couplingEfficiency(incident, fiberModeFromMFD(mfd, incident.lambda0, { n: incident.n }), misalignment);

/**
 * Two-waist reduction: both fields at their waists, on axis, no tilt.
 * eta = (2 w1 w2 / (w1^2 + w2^2))^2. Exposed because it is the textbook
 * mode-matching expression the agent quotes when explaining the general case.
 */
export const twoWaistEfficiency = (w1: Length, w2: Length): number => {
  const a = toM(w1);
  const b = toM(w2);
  return ((2 * a * b) / (a * a + b * b)) ** 2;
};
