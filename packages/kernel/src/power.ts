/**
 * Power budget: P_out = P_in * prod(T_i).
 *
 * Deliberately trivial and deliberately explicit — every loss in the chain is
 * itemized so the UI can show where the photons went, per AGENTS.md's rule
 * that every displayed number is traceable.
 */

import type { Power } from './units.js';
import { scale, sub, toW, W } from './units.js';
import type { Assumption } from './assumptions.js';
import { INCOHERENT_POWER_BUDGET, MONOCHROMATIC, NO_APERTURE_CLIPPING } from './assumptions.js';

export const ASSUMPTIONS: readonly Assumption[] = Object.freeze([
  INCOHERENT_POWER_BUDGET,
  NO_APERTURE_CLIPPING,
  MONOCHROMATIC,
]);

/** One transmitting stage in the chain. */
export interface Stage {
  readonly id: string;
  /** Power transmission in [0, 1]. */
  readonly T: number;
}

const checkT = (T: number, id?: string): number => {
  if (!(T >= 0 && T <= 1)) {
    throw new Error(`transmission must be in [0, 1]${id ? ` (element ${id})` : ''}, got ${T}`);
  }
  return T;
};

/** Total transmission of a chain of stages. */
export const totalTransmission = (Ts: readonly number[]): number =>
  Ts.reduce<number>((acc, T) => acc * checkT(T), 1);

/** P_out = P_in * prod(T_i). */
export const transmit = (pIn: Power, Ts: readonly number[]): Power =>
  scale(pIn, totalTransmission(Ts));

export interface BudgetStage {
  readonly id: string;
  readonly T: number;
  /** Power entering this stage. */
  readonly powerIn: Power;
  /** Power leaving this stage. */
  readonly powerOut: Power;
  /** Power lost in this stage. */
  readonly loss: Power;
}

export interface PowerBudget {
  readonly input: Power;
  readonly output: Power;
  readonly totalTransmission: number;
  readonly stages: readonly BudgetStage[];
}

/** Itemized power budget through an ordered chain of stages. */
export const powerBudget = (pIn: Power, stages: readonly Stage[]): PowerBudget => {
  let running = pIn;
  const detail: BudgetStage[] = [];
  for (const s of stages) {
    const powerIn = running;
    const powerOut = scale(powerIn, checkT(s.T, s.id));
    detail.push({ id: s.id, T: s.T, powerIn, powerOut, loss: sub(powerIn, powerOut) });
    running = powerOut;
  }
  return {
    input: pIn,
    output: running,
    totalTransmission: toW(pIn) === 0 ? totalTransmission(stages.map((s) => s.T)) : toW(running) / toW(pIn),
    stages: detail,
  };
};

/** Convenience: a lossless stage. */
export const LOSSLESS: Stage = { id: 'lossless', T: 1 };

/** Zero power, for folds. */
export const ZERO_POWER: Power = W(0);
