/**
 * Rydberg-state scaling laws for rubidium. Quantum-defect (n*) description throughout.
 * Anchors: Rb Rydberg constant (Steck / Li et al. 2003), Beterov et al. PRA 79, 052504 (2009)
 * nS lifetimes, Bernien et al. Nature 551, 579 (2017) 70S C6.
 */
import { rbC6EstimateGHzUm6 } from './beams.ts';
import { effectiveN, meanRadiusNm } from './orbitals.ts';

export const RY_RB_THZ = 3289.82; // Rydberg constant for Rb, R_Rb·c, THz
export const ATOMIC_TIME_S = 2.4188843e-17;
export const A0_NM = 0.0529177;
export const KB_OVER_EH_300K = 9.5e-4; // k_B·300 K / Hartree
export const ALPHA_FS = 7.2973525693e-3;

/** Binding energy of nℓ below the ionisation limit, THz (positive number). */
export function bindingTHz(n: number, l = 0): number {
  const ns = effectiveN(n, l);
  return RY_RB_THZ / (ns * ns);
}

export function bindingCm(n: number, l = 0): number {
  return bindingTHz(n, l) / 0.0299792458; // 1 cm⁻¹ = 29.9792458 GHz
}

export function bindingEV(n: number, l = 0): number {
  return bindingTHz(n, l) * 4.135667696e-3; // h in eV·ps → eV per THz
}

/** Spacing to the next level of the same series, GHz. */
export function spacingGHz(n: number, l = 0): number {
  return (bindingTHz(n, l) - bindingTHz(n + 1, l)) * 1e3;
}

/** Kepler period of the classical orbit, 2π n*³ atomic units, in seconds. */
export function orbitPeriodS(n: number, l = 0): number {
  const ns = effectiveN(n, l);
  return 2 * Math.PI * ns ** 3 * ATOMIC_TIME_S;
}

/** ⟨r⟩ in μm for the nℓ state. */
export function meanRadiusUm(n: number, l = 0): number {
  return meanRadiusNm(n, l) * 1e-3;
}

/** Radiative lifetime at 0 K for Rb nS (Beterov 2009 fit τ₀ n*^α), seconds. */
export function radiativeLifetimeS(n: number): number {
  return 1.368e-9 * effectiveN(n, 0) ** 3.0008;
}

/** Black-body-induced decay rate Γ_BB ≈ 4α³ k_B T / (3ħ n*²) (Gallagher), s⁻¹, at temperature T (K). */
export function blackbodyRateHz(n: number, tK = 300, l = 0): number {
  const ns = effectiveN(n, l);
  const rateAu = (4 * ALPHA_FS ** 3 * KB_OVER_EH_300K * (tK / 300)) / (3 * ns * ns);
  return rateAu / ATOMIC_TIME_S;
}

/** Total lifetime at temperature T including black-body redistribution, seconds. */
export function lifetimeS(n: number, tK = 300): number {
  return 1 / (1 / radiativeLifetimeS(n) + blackbodyRateHz(n, tK));
}

/** Transition dipole between neighbouring Rydberg states ~ n*² e a₀, in Debye. */
export function dipoleDebye(n: number, l = 0): number {
  const ns = effectiveN(n, l);
  return ns * ns * 2.541746; // e·a₀ = 2.5417 D
}

/** van der Waals shift C6/R⁶ in MHz for two nS atoms R μm apart (C6 from the anchored n*¹¹ law). */
export function vdwShiftMHz(n: number, rUm: number): number {
  return (rbC6EstimateGHzUm6(n) * 1e3) / rUm ** 6;
}

/** Polarizability relative to the n = 53 S state, scaling n*⁷. */
export function relativePolarizability(n: number, ref = 53): number {
  return (effectiveN(n, 0) / effectiveN(ref, 0)) ** 7;
}

/** Fit a power law y ∝ n*^p between two n values; used to display the local exponent. */
export function localExponent(f: (n: number) => number, n: number): number {
  const a = f(n);
  const b = f(n + 1);
  return Math.log(b / a) / Math.log(effectiveN(n + 1, 0) / effectiveN(n, 0));
}
