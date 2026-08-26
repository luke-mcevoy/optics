/**
 * ABCD ray matrices — *unreduced* convention.
 *
 * The ray vector is (y, u) with u the true angle in the local medium (NOT the
 * reduced angle n*u). Consequences (SESSION.md, binding):
 *
 *   - a flat interface is [[1, 0], [0, n1/n2]]
 *   - det(M) = n1/n2 in general, and exactly 1 when the input and output media
 *     have the same index
 *   - q transforms as q' = (A q + B)/(C q + D), and with the gaussian.ts q
 *     convention a flat interface gives q' = q * n2/n1 with w unchanged
 *
 * Elements carry no propagation logic: a matrix is a pure function of the
 * element's parameters, exactly as AGENTS.md's trait interface requires.
 */

import type { Complex } from './complex.js';
import { c, cAdd, cDiv, cScale } from './complex.js';
import type { GaussianBeam } from './gaussian.js';
import type { Length } from './units.js';
import { toM } from './units.js';
import type { Assumption } from './assumptions.js';
import {
  HOMOGENEOUS_MEDIUM,
  IDEAL_SURFACE,
  NO_APERTURE_CLIPPING,
  PARAXIAL,
  THIN_LENS,
} from './assumptions.js';

export const ASSUMPTIONS: readonly Assumption[] = Object.freeze([
  PARAXIAL,
  IDEAL_SURFACE,
  HOMOGENEOUS_MEDIUM,
  NO_APERTURE_CLIPPING,
]);

/** Per-element assumptions, keyed by the constructor name. */
export const ELEMENT_ASSUMPTIONS: Readonly<Record<string, readonly Assumption[]>> = Object.freeze({
  freeSpace: [PARAXIAL, HOMOGENEOUS_MEDIUM],
  thinLens: [PARAXIAL, THIN_LENS, IDEAL_SURFACE, NO_APERTURE_CLIPPING],
  curvedMirror: [PARAXIAL, IDEAL_SURFACE, NO_APERTURE_CLIPPING],
  flatInterface: [PARAXIAL, IDEAL_SURFACE],
  curvedInterface: [PARAXIAL, IDEAL_SURFACE, NO_APERTURE_CLIPPING],
});

/** A 2x2 real ray-transfer matrix [[A, B], [C, D]]. */
export interface ABCD {
  readonly A: number;
  readonly B: number;
  readonly C: number;
  readonly D: number;
}

export const abcd = (A: number, B: number, C: number, D: number): ABCD => ({ A, B, C, D });

export const IDENTITY: ABCD = abcd(1, 0, 0, 1);

export const det = (m: ABCD): number => m.A * m.D - m.B * m.C;

/** Free space (or any homogeneous medium) of geometric thickness d. */
export const freeSpace = (d: Length): ABCD => abcd(1, toM(d), 0, 1);

/** Thin lens of focal length f (positive = converging). */
export const thinLens = (f: Length): ABCD => {
  if (toM(f) === 0) throw new Error('focal length must be non-zero');
  return abcd(1, 0, -1 / toM(f), 1);
};

/**
 * Curved mirror at normal incidence, radius of curvature R (positive =
 * concave toward the incoming beam). Equivalent to a thin lens with f = R/2.
 */
export const curvedMirror = (R: Length): ABCD => {
  if (toM(R) === 0) throw new Error('mirror radius must be non-zero');
  return abcd(1, 0, -2 / toM(R), 1);
};

/** Flat refracting interface from index n1 into index n2. */
export const flatInterface = (n1: number, n2: number): ABCD => {
  if (!(n1 > 0 && n2 > 0)) throw new Error('refractive indices must be positive');
  return abcd(1, 0, 0, n1 / n2);
};

/**
 * Curved refracting interface, radius R (positive = centre of curvature
 * downstream, i.e. convex toward the incoming beam), from n1 into n2:
 *
 *     [[1, 0], [(n1 - n2)/(R n2), n1/n2]]
 */
export const curvedInterface = (R: Length, n1: number, n2: number): ABCD => {
  if (!(n1 > 0 && n2 > 0)) throw new Error('refractive indices must be positive');
  if (toM(R) === 0) throw new Error('surface radius must be non-zero');
  return Number.isFinite(toM(R))
    ? abcd(1, 0, (n1 - n2) / (toM(R) * n2), n1 / n2)
    : flatInterface(n1, n2);
};

/** Multiply two matrices: `after` acts second. */
export const times = (after: ABCD, before: ABCD): ABCD =>
  abcd(
    after.A * before.A + after.B * before.C,
    after.A * before.B + after.B * before.D,
    after.C * before.A + after.D * before.C,
    after.C * before.B + after.D * before.D,
  );

/**
 * Compose matrices given in *propagation order* (first element the light hits
 * first). `compose(m1, m2, m3)` is the matrix product m3 * m2 * m1.
 */
export const compose = (...ms: readonly ABCD[]): ABCD =>
  ms.reduce<ABCD>((acc, m) => times(m, acc), IDENTITY);

/** Apply a matrix to a ray (y, u). */
export const applyToRay = (m: ABCD, y: number, u: number): { y: number; u: number } => ({
  y: m.A * y + m.B * u,
  u: m.C * y + m.D * u,
});

/** Apply a matrix to a complex beam parameter: q' = (Aq + B)/(Cq + D). */
export const applyToQ = (m: ABCD, q: Complex): Complex => {
  const num = cAdd(cScale(q, m.A), c(m.B, 0));
  const den = cAdd(cScale(q, m.C), c(m.D, 0));
  return cDiv(num, den);
};

/**
 * Apply a matrix to a Gaussian beam. Pass `nOut` when the matrix crosses into
 * a different medium (e.g. an interface); the beam's index is updated so that
 * w and R stay physically consistent.
 */
export const applyToBeam = (m: ABCD, beam: GaussianBeam, nOut: number = beam.n): GaussianBeam => ({
  ...beam,
  q: applyToQ(m, beam.q),
  n: nOut,
});
