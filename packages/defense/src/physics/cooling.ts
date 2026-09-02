/**
 * Laser cooling, trapping and fluorescence detection of ⁸⁷Rb on the D2 line.
 * SI units; velocities m/s, temperatures K, rates s⁻¹. Standard constants from Steck.
 */
import { HBAR, KB, RB87_MASS, RB_LINES } from './light.ts';
import { poissonPmf } from './formulas.ts';

export const GAMMA = RB_LINES.d2.gamma; // rad/s
export const K_D2 = (2 * Math.PI) / RB_LINES.d2.lambdaM; // m⁻¹
export const I_SAT_WM2 = 16.69; // W/m², D2 cycling transition (Steck: 1.669 mW/cm²)

/** Maxwell–Boltzmann speed distribution f(v) (per m/s) at temperature T. */
export function maxwellBoltzmann(v: number, tK: number, m = RB87_MASS): number {
  const a = m / (2 * KB * tK);
  return 4 * Math.PI * v * v * (a / Math.PI) ** 1.5 * Math.exp(-a * v * v);
}

export function vRms(tK: number, m = RB87_MASS): number {
  return Math.sqrt((3 * KB * tK) / m);
}

export function vMostProbable(tK: number, m = RB87_MASS): number {
  return Math.sqrt((2 * KB * tK) / m);
}

/** Thermal de Broglie wavelength λ = h / √(2π m k_B T). */
export function deBroglieM(tK: number, m = RB87_MASS): number {
  return (2 * Math.PI * HBAR) / Math.sqrt(2 * Math.PI * m * KB * tK);
}

export function recoilVelocity(k = K_D2, m = RB87_MASS): number {
  return (HBAR * k) / m;
}

/** Recoil temperature T_r = ħ²k²/(m k_B): 362 nK for Rb D2. */
export function recoilTempK(k = K_D2, m = RB87_MASS): number {
  return (HBAR * HBAR * k * k) / (m * KB);
}

/** Doppler limit T_D = ħΓ/(2 k_B): 146 μK for Rb D2. */
export function dopplerLimitK(gamma = GAMMA): number {
  return (HBAR * gamma) / (2 * KB);
}

/** Doppler temperature at general detuning (low intensity): k_B T = ħΓ/4 · (1 + (2Δ/Γ)²)/(2|Δ|/Γ). */
export function dopplerTempK(deltaOverGamma: number, gamma = GAMMA): number {
  const x = 2 * Math.abs(deltaOverGamma);
  if (x === 0) return Infinity;
  return ((HBAR * gamma) / (4 * KB)) * ((1 + x * x) / x);
}

/** Photon scattering rate of a two-level atom, Γ/2 · s/(1 + s + 4Δ²/Γ²). */
export function scatterRate(s: number, deltaRad: number, gamma = GAMMA): number {
  return ((gamma / 2) * s) / (1 + s + (4 * deltaRad * deltaRad) / (gamma * gamma));
}

/**
 * Net radiation-pressure force on an atom moving with velocity v along the axis of two
 * counter-propagating beams (each of saturation parameter s, detuning Δ), with an optional
 * extra position-dependent Zeeman detuning ±βz (MOT). Newtons.
 */
export function twoBeamForce(v: number, s: number, deltaRad: number, zeemanRad = 0, k = K_D2, gamma = GAMMA): number {
  const rPlus = scatterRate(s, deltaRad - k * v - zeemanRad, gamma);
  const rMinus = scatterRate(s, deltaRad + k * v + zeemanRad, gamma);
  return HBAR * k * (rPlus - rMinus);
}

/** Momentum-diffusion coefficient D_p = 2ħ²k²(R₊ + R₋), 1D (Foot §9.3.1). kg² m² s⁻³ */
export function momentumDiffusion(v: number, s: number, deltaRad: number, zeemanRad = 0, k = K_D2, gamma = GAMMA): number {
  const rPlus = scatterRate(s, deltaRad - k * v - zeemanRad, gamma);
  const rMinus = scatterRate(s, deltaRad + k * v + zeemanRad, gamma);
  return 2 * HBAR * HBAR * k * k * (rPlus + rMinus);
}

/** One Langevin step for a 1D atom in the two-beam field; returns the new velocity. */
export function langevinStep(v: number, dt: number, s: number, deltaRad: number, gauss: number, zeemanRad = 0, m = RB87_MASS): number {
  const F = twoBeamForce(v, s, deltaRad, zeemanRad);
  const D = momentumDiffusion(v, s, deltaRad, zeemanRad);
  return v + (F / m) * dt + (Math.sqrt(D * dt) / m) * gauss;
}

/** Temperature of a 1D velocity sample: k_B T = m ⟨v²⟩. */
export function temperature1D(vs: ArrayLike<number>, m = RB87_MASS): number {
  let s2 = 0;
  for (let i = 0; i < vs.length; i += 1) s2 += (vs[i] ?? 0) ** 2;
  return (m * s2) / vs.length / KB;
}

/* ---------------------------------------------------------------- detection */

export type ImagingBudget = {
  scatterRateHz: number;
  photonsScattered: number;
  collected: number;
  meanCounts: number;
  heatingMK: number;
};

/**
 * Photon budget for fluorescence imaging: scattering rate × exposure × collection × optics ×
 * quantum efficiency. Heating: 2 recoil energies per scattered photon (absorption + emission),
 * expressed as a temperature-equivalent 2N E_r / k_B.
 */
export function imagingBudget(opts: { exposureS: number; s: number; deltaRad: number; collection: number; optics: number; qe: number }): ImagingBudget {
  const R = scatterRate(opts.s, opts.deltaRad);
  const N = R * opts.exposureS;
  const collected = N * opts.collection * opts.optics;
  const eR = (HBAR * HBAR * K_D2 * K_D2) / (2 * RB87_MASS);
  return {
    scatterRateHz: R,
    photonsScattered: N,
    collected,
    meanCounts: collected * opts.qe,
    heatingMK: ((2 * N * eR) / KB) * 1e3,
  };
}

/**
 * Best threshold and discrimination fidelity between Poisson(μ0) (no atom + background) and
 * Poisson(μ1) (atom + background), F = 1 − ½[P(k ≥ thr | μ0) + P(k < thr | μ1)].
 */
export function discriminationFidelity(mu0: number, mu1: number): { threshold: number; fidelity: number } {
  const kMax = Math.ceil(mu1 + 8 * Math.sqrt(mu1 + 1)) + 5;
  let best = { threshold: 0, fidelity: 0 };
  let cdf0 = 0;
  let cdf1 = 0;
  for (let thr = 0; thr <= kMax; thr += 1) {
    // P(k >= thr | mu0) = 1 - cdf0(thr-1); P(k < thr | mu1) = cdf1(thr-1)
    const f = 1 - 0.5 * (1 - cdf0 + cdf1);
    if (f > best.fidelity) best = { threshold: thr, fidelity: f };
    cdf0 += poissonPmf(thr, mu0);
    cdf1 += poissonPmf(thr, mu1);
  }
  return best;
}
