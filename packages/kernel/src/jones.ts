/**
 * Polarization — Jones vectors and matrices.
 *
 * Field convention: E(t) ~ Re[J * exp(-i*omega*t)], so a *negative* phase
 * factor exp(-i*delta) means that component lags. Waveplates are written in
 * the symmetric (unit-determinant) form
 *
 *     J(delta, theta) = R(theta) * diag(exp(-i*delta/2), exp(+i*delta/2)) * R(-theta)
 *
 * which is unitary, so the lossless-element property test bites.
 *
 * Stokes parameters follow S2 = 2*Re(conj(Ex)*Ey), S3 = 2*Im(conj(Ex)*Ey), so
 * S3 = +1 is left-circular in the optics (source-looking-at-you) convention.
 * Only the *sign consistency* matters inside the kernel; handedness is
 * reported explicitly rather than left implicit.
 */

import type { Complex } from './complex.js';
import { c, cAbs2, cAdd, cConj, cExp, cMul, cScale, cSub } from './complex.js';
import type { Angle } from './units.js';
import { rad, toRad } from './units.js';
import type { Assumption } from './assumptions.js';
import {
  FULLY_POLARIZED,
  IDEAL_POLARIZER,
  LOSSLESS_ELEMENT,
  MONOCHROMATIC,
  PARAXIAL,
} from './assumptions.js';

export const ASSUMPTIONS: readonly Assumption[] = Object.freeze([
  PARAXIAL,
  FULLY_POLARIZED,
  MONOCHROMATIC,
]);

export const ELEMENT_ASSUMPTIONS: Readonly<Record<string, readonly Assumption[]>> = Object.freeze({
  linearPolarizer: [IDEAL_POLARIZER, FULLY_POLARIZED],
  waveplate: [LOSSLESS_ELEMENT, MONOCHROMATIC, FULLY_POLARIZED],
  halfWavePlate: [LOSSLESS_ELEMENT, MONOCHROMATIC, FULLY_POLARIZED],
  quarterWavePlate: [LOSSLESS_ELEMENT, MONOCHROMATIC, FULLY_POLARIZED],
  rotator: [LOSSLESS_ELEMENT, FULLY_POLARIZED],
  pbsTransmitted: [IDEAL_POLARIZER, FULLY_POLARIZED],
  pbsReflected: [IDEAL_POLARIZER, FULLY_POLARIZED],
});

/** A Jones vector (Ex, Ey) of complex field amplitudes. */
export interface JonesVector {
  readonly x: Complex;
  readonly y: Complex;
}

/** A 2x2 complex Jones matrix [[xx, xy], [yx, yy]]. */
export interface JonesMatrix {
  readonly xx: Complex;
  readonly xy: Complex;
  readonly yx: Complex;
  readonly yy: Complex;
}

export const jonesVector = (x: Complex, y: Complex): JonesVector => ({ x, y });

export const jonesMatrix = (
  xx: Complex,
  xy: Complex,
  yx: Complex,
  yy: Complex,
): JonesMatrix => ({ xx, xy, yx, yy });

export const JONES_IDENTITY: JonesMatrix = jonesMatrix(c(1), c(0), c(0), c(1));

// --- Standard states -----------------------------------------------------

/** Unit-intensity linear polarization at angle theta from the x axis. */
export const linear = (theta: Angle): JonesVector =>
  jonesVector(c(Math.cos(toRad(theta))), c(Math.sin(toRad(theta))));

export const HORIZONTAL: JonesVector = jonesVector(c(1), c(0));
export const VERTICAL: JonesVector = jonesVector(c(0), c(1));

/** Circular states, normalized to unit intensity. */
export const CIRCULAR_S3_POSITIVE: JonesVector = jonesVector(
  c(Math.SQRT1_2),
  c(0, Math.SQRT1_2),
);
export const CIRCULAR_S3_NEGATIVE: JonesVector = jonesVector(
  c(Math.SQRT1_2),
  c(0, -Math.SQRT1_2),
);

// --- Elements ------------------------------------------------------------

const rot = (t: number): JonesMatrix =>
  jonesMatrix(c(Math.cos(t)), c(-Math.sin(t)), c(Math.sin(t)), c(Math.cos(t)));

/** Coordinate rotation of the field by angle theta (an optical rotator). */
export const rotator = (theta: Angle): JonesMatrix => rot(toRad(theta));

/** Ideal linear polarizer with pass axis at angle theta. */
export const linearPolarizer = (theta: Angle): JonesMatrix => {
  const t = toRad(theta);
  const ct = Math.cos(t);
  const st = Math.sin(t);
  return jonesMatrix(c(ct * ct), c(ct * st), c(ct * st), c(st * st));
};

/** Linear retarder of retardance `delta` with fast axis at angle `theta`. */
export const waveplate = (delta: Angle, theta: Angle): JonesMatrix => {
  const d = toRad(delta);
  const fast = cExp(c(0, -d / 2));
  const slow = cExp(c(0, +d / 2));
  const diag = jonesMatrix(fast, c(0), c(0), slow);
  return composeJones(rotator(rad(-toRad(theta))), diag, rotator(theta));
};

/** Half-wave plate (delta = pi) with fast axis at angle theta. */
export const halfWavePlate = (theta: Angle): JonesMatrix => waveplate(rad(Math.PI), theta);

/** Quarter-wave plate (delta = pi/2) with fast axis at angle theta. */
export const quarterWavePlate = (theta: Angle): JonesMatrix => waveplate(rad(Math.PI / 2), theta);

/**
 * Polarizing beamsplitter, transmitted port: p-polarized (x) light passes.
 * Ideal — infinite extinction, no loss between the two ports.
 */
export const pbsTransmitted = (): JonesMatrix => linearPolarizer(rad(0));

/** Polarizing beamsplitter, reflected port: s-polarized (y) light reflects. */
export const pbsReflected = (): JonesMatrix => linearPolarizer(rad(Math.PI / 2));

// --- Algebra -------------------------------------------------------------

export const applyJones = (m: JonesMatrix, v: JonesVector): JonesVector =>
  jonesVector(
    cAdd(cMul(m.xx, v.x), cMul(m.xy, v.y)),
    cAdd(cMul(m.yx, v.x), cMul(m.yy, v.y)),
  );

export const timesJones = (after: JonesMatrix, before: JonesMatrix): JonesMatrix =>
  jonesMatrix(
    cAdd(cMul(after.xx, before.xx), cMul(after.xy, before.yx)),
    cAdd(cMul(after.xx, before.xy), cMul(after.xy, before.yy)),
    cAdd(cMul(after.yx, before.xx), cMul(after.yy, before.yx)),
    cAdd(cMul(after.yx, before.xy), cMul(after.yy, before.yy)),
  );

/** Compose Jones matrices given in propagation order (light hits m1 first). */
export const composeJones = (...ms: readonly JonesMatrix[]): JonesMatrix =>
  ms.reduce<JonesMatrix>((acc, m) => timesJones(m, acc), JONES_IDENTITY);

export const detJones = (m: JonesMatrix): Complex =>
  cSub(cMul(m.xx, m.yy), cMul(m.xy, m.yx));

/** Conjugate transpose. */
export const daggerJones = (m: JonesMatrix): JonesMatrix =>
  jonesMatrix(cConj(m.xx), cConj(m.yx), cConj(m.xy), cConj(m.yy));

/** True when M^dagger M = I to within `tol` — i.e. the element is lossless. */
export const isUnitary = (m: JonesMatrix, tol = 1e-12): boolean => {
  const p = timesJones(daggerJones(m), m);
  return (
    Math.abs(p.xx.re - 1) <= tol &&
    Math.abs(p.xx.im) <= tol &&
    Math.abs(p.yy.re - 1) <= tol &&
    Math.abs(p.yy.im) <= tol &&
    Math.abs(p.xy.re) <= tol &&
    Math.abs(p.xy.im) <= tol &&
    Math.abs(p.yx.re) <= tol &&
    Math.abs(p.yx.im) <= tol
  );
};

/** Total intensity |Ex|^2 + |Ey|^2. */
export const intensity = (v: JonesVector): number => cAbs2(v.x) + cAbs2(v.y);

export const normalize = (v: JonesVector): JonesVector => {
  const s = Math.sqrt(intensity(v));
  if (s === 0) throw new Error('cannot normalize a zero Jones vector');
  return jonesVector(cScale(v.x, 1 / s), cScale(v.y, 1 / s));
};

/** Largest singular value squared: the maximum power transmission of M. */
export const maxTransmission = (m: JonesMatrix): number => {
  // Eigenvalues of the 2x2 Hermitian M^dagger M, closed form.
  const p = timesJones(daggerJones(m), m);
  const tr = p.xx.re + p.yy.re;
  const dt = p.xx.re * p.yy.re - (p.xy.re * p.yx.re - p.xy.im * p.yx.im);
  const disc = Math.max(0, (tr / 2) ** 2 - dt);
  return tr / 2 + Math.sqrt(disc);
};

// --- Stokes / ellipse ----------------------------------------------------

export interface Stokes {
  readonly S0: number;
  readonly S1: number;
  readonly S2: number;
  readonly S3: number;
}

export const stokes = (v: JonesVector): Stokes => {
  const ix = cAbs2(v.x);
  const iy = cAbs2(v.y);
  const cross = cMul(cConj(v.x), v.y);
  return { S0: ix + iy, S1: ix - iy, S2: 2 * cross.re, S3: 2 * cross.im };
};

/**
 * Degree of circularity S3/S0: +/-1 for circular, 0 for linear. The sign
 * distinguishes the two handednesses under the convention documented above.
 */
export const degreeOfCircularity = (v: JonesVector): number => {
  const s = stokes(v);
  if (s.S0 === 0) throw new Error('undefined for a zero field');
  return s.S3 / s.S0;
};

/**
 * Degree of polarization. Exactly 1 for any Jones vector by construction —
 * exposed so the assumption is visible rather than implicit.
 */
export const degreeOfPolarization = (v: JonesVector): number => {
  const s = stokes(v);
  if (s.S0 === 0) throw new Error('undefined for a zero field');
  return Math.hypot(s.S1, s.S2, s.S3) / s.S0;
};

export interface PolarizationEllipse {
  /** Azimuth of the major axis from the x axis, in (-pi/2, pi/2]. */
  readonly orientation: Angle;
  /** Ellipticity angle chi in [-pi/4, pi/4]; +/-pi/4 is circular. */
  readonly ellipticityAngle: Angle;
  /** Ratio of minor to major axis, tan(chi), in [-1, 1]. */
  readonly ellipticity: number;
  /** 'linear' when S3 ~ 0, else the handedness implied by sign(S3). */
  readonly handedness: 'linear' | 'left' | 'right';
}

export const ellipse = (v: JonesVector, tol = 1e-9): PolarizationEllipse => {
  const s = stokes(v);
  if (s.S0 === 0) throw new Error('undefined for a zero field');
  const orientation = 0.5 * Math.atan2(s.S2, s.S1);
  const chi = 0.5 * Math.asin(Math.max(-1, Math.min(1, s.S3 / s.S0)));
  const handedness: PolarizationEllipse['handedness'] =
    Math.abs(s.S3 / s.S0) <= tol ? 'linear' : s.S3 > 0 ? 'left' : 'right';
  return {
    orientation: rad(orientation),
    ellipticityAngle: rad(chi),
    ellipticity: Math.tan(chi),
    handedness,
  };
};
