/**
 * @optics/kernel — deterministic v1 physics kernel.
 *
 * Pure functions, zero runtime dependencies. Modules are exported as
 * namespaces because several of them share names by design (each declares its
 * own `ASSUMPTIONS`), and because `abcd.thinLens` / `jones.quarterWavePlate`
 * read better at the call site than a flat soup of identifiers.
 */

export * as units from './units.js';
export * as complex from './complex.js';
export * as gaussian from './gaussian.js';
export * as abcd from './abcd.js';
export * as jones from './jones.js';
export * as coupling from './coupling.js';
export * as power from './power.js';
export * as assumptions from './assumptions.js';

export type { Length, Power, Angle, Quantity } from './units.js';
export type { Complex } from './complex.js';
export type { GaussianBeam, BeamOptions } from './gaussian.js';
export type { ABCD } from './abcd.js';
export type { JonesVector, JonesMatrix, Stokes, PolarizationEllipse } from './jones.js';
export type { Misalignment } from './coupling.js';
export type { Stage, PowerBudget, BudgetStage } from './power.js';
export type { Assumption } from './assumptions.js';

import type { Assumption } from './assumptions.js';
import { ASSUMPTIONS as GAUSSIAN_ASSUMPTIONS } from './gaussian.js';
import { ASSUMPTIONS as ABCD_ASSUMPTIONS } from './abcd.js';
import { ASSUMPTIONS as JONES_ASSUMPTIONS } from './jones.js';
import { ASSUMPTIONS as COUPLING_ASSUMPTIONS } from './coupling.js';
import { ASSUMPTIONS as POWER_ASSUMPTIONS } from './power.js';

/** Every module's declared assumptions, for the agent and UI to surface. */
export const KERNEL_ASSUMPTIONS: Readonly<Record<string, readonly Assumption[]>> = Object.freeze({
  gaussian: GAUSSIAN_ASSUMPTIONS,
  abcd: ABCD_ASSUMPTIONS,
  jones: JONES_ASSUMPTIONS,
  coupling: COUPLING_ASSUMPTIONS,
  power: POWER_ASSUMPTIONS,
});
