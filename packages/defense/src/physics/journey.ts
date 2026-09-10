/** Ideal teaching circuits. These are not reconstructions of the paper's pulse sequence. */
import { apply1, cz, H_GATE, KET00, probabilities, type Mat2, type State } from './twoqubit.ts';

/** H → phase(φ) → H on A, with B left in |0⟩. */
export function interferenceState(phase: number): State {
  const phaseGate: Mat2 = [[1, 0], [0, 0], [0, 0], [Math.cos(phase), Math.sin(phase)]];
  return apply1(apply1(apply1(KET00, H_GATE, 0), phaseGate, 0), H_GATE, 0);
}

/** Prepare |++⟩, optionally apply CZ, then H on B: Bell pair or |+0⟩. */
export function teachingPair(entangle: boolean): State {
  const prepared = apply1(apply1(KET00, H_GATE, 0), H_GATE, 1);
  return apply1(entangle ? cz(prepared) : prepared, H_GATE, 1);
}

/** Joint Born-rule sample, supplied randomness in [0,1). Each call is a fresh preparation. */
export function samplePair(state: State, random: number): number {
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw new RangeError('random must be in [0, 1)');
  let cumulative = 0;
  for (const [outcome, probability] of probabilities(state).entries()) {
    cumulative += probability;
    if (random < cumulative) return outcome;
  }
  return 3; // floating-point roundoff at the final boundary
}

/** Z₀Z₁ and Z₁Z₂ syndrome of a three-qubit bit-flip repetition code. */
export function bitFlipSyndrome(error: number | null): readonly [1 | -1, 1 | -1] {
  return [error === 0 || error === 1 ? -1 : 1, error === 1 || error === 2 ? -1 : 1];
}

/** Valid only for at most one X error and ideal parity measurements. */
export function locateBitFlip(syndrome: readonly [number, number]): number | null {
  const [left, right] = syndrome;
  if (left === -1 && right === 1) return 0;
  if (left === -1 && right === -1) return 1;
  if (left === 1 && right === -1) return 2;
  return null;
}
