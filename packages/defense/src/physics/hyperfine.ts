/**
 * ⁸⁷Rb ground-state hyperfine and Zeeman structure, from standard atomic data
 * (D. A. Steck, "Rubidium 87 D Line Data", steck.us/alkalidata). Nothing here is
 * from the Bluvstein/Geim paper; the paper's 8.6 G bias field is fed in as input.
 *
 * Frequencies in Hz (E/h) unless the name says otherwise; magnetic field in gauss.
 */

export const RB87_HFS = {
  /** Nuclear spin. */
  I: 1.5,
  /** 5S₁/₂ ground-state hyperfine splitting ΔE_hfs/h. */
  groundSplittingHz: 6.83468261090429e9,
  /** 5S₁/₂ magnetic-dipole constant A_hfs/h. */
  groundAHz: 3.417341305452145e9,
  /** Fine-structure Landé factor of 5S₁/₂ (measured). */
  gJ: 2.00233113,
  /** Nuclear g-factor in units of μ_B (sign convention: μ_I = g_I μ_B I). */
  gI: -0.0009951414,
  /** Bohr magneton over h, Hz/G. */
  muBHzPerG: 1.399624604e6,
  /** D1 (5S₁/₂ → 5P₁/₂) and D2 (5S₁/₂ → 5P₃/₂) centre-of-gravity frequencies. */
  d1Hz: 377.10746338e12,
  d2Hz: 384.2304844685e12,
  /** 5P₁/₂ hyperfine offsets from its centre of gravity, keyed by F′. */
  p12OffsetsHz: { 1: -509.05e6, 2: 305.43e6 } as Record<number, number>,
  /** 5P₃/₂ hyperfine offsets from its centre of gravity, keyed by F′. */
  p32OffsetsHz: { 0: -302.0738e6, 1: -229.8518e6, 2: -72.9113e6, 3: 193.7408e6 } as Record<number, number>,
  /** 5P₃/₂ natural linewidth Γ/2π. */
  d2LinewidthHz: 6.0666e6,
} as const;

const J = 0.5;

/** Hyperfine energy of the ground manifold F from the magnetic-dipole term alone, Hz. */
export function groundHyperfineHz(F: number): number {
  const I = RB87_HFS.I;
  return (RB87_HFS.groundAHz / 2) * (F * (F + 1) - I * (I + 1) - J * (J + 1));
}

/** Landé g_F for a J = 1/2 ground state (includes the nuclear term). */
export function landeGF(F: number): number {
  const I = RB87_HFS.I;
  const gJ = RB87_HFS.gJ;
  const gI = RB87_HFS.gI;
  const FF = F * (F + 1);
  const II = I * (I + 1);
  const JJ = J * (J + 1);
  return (gJ * (FF - II + JJ)) / (2 * FF) + (gI * (FF + II - JJ)) / (2 * FF);
}

/** Breit–Rabi parameter x = (g_J − g_I) μ_B B / ΔE_hfs. */
export function breitRabiX(bGauss: number): number {
  return ((RB87_HFS.gJ - RB87_HFS.gI) * RB87_HFS.muBHzPerG * bGauss) / RB87_HFS.groundSplittingHz;
}

/**
 * Breit–Rabi energy (E/h, Hz) of the ground-state level |F, m_F⟩ in a field B.
 * Zero of energy is the hyperfine centre of gravity. Exact for J = 1/2.
 */
export function breitRabiHz(F: number, mF: number, bGauss: number): number {
  const I = RB87_HFS.I;
  const dE = RB87_HFS.groundSplittingHz;
  const x = breitRabiX(bGauss);
  const nuclear = RB87_HFS.gI * RB87_HFS.muBHzPerG * mF * bGauss;
  const upper = F === I + J;
  // Stretched states: the square root collapses to |1 ± x|; write them out to keep the
  // correct branch when x > 1.
  if (Math.abs(mF) === I + J) {
    const sign = mF > 0 ? 1 : -1;
    return (dE * I) / (2 * I + 1) + (sign * (RB87_HFS.gJ + 2 * I * RB87_HFS.gI) * RB87_HFS.muBHzPerG * bGauss) / 2;
  }
  const root = Math.sqrt(1 + (4 * mF * x) / (2 * I + 1) + x * x);
  return -dE / (2 * (2 * I + 1)) + nuclear + (upper ? 1 : -1) * (dE / 2) * root;
}

/** Clock transition |1,0⟩ → |2,0⟩ frequency shift from its zero-field value, Hz. */
export function clockShiftHz(bGauss: number): number {
  const x = breitRabiX(bGauss);
  return RB87_HFS.groundSplittingHz * (Math.sqrt(1 + x * x) - 1);
}

/** Small-field quadratic coefficient of the clock shift, Hz/G² (Steck: 575.15). */
export function clockQuadraticHzPerG2(): number {
  const g = (RB87_HFS.gJ - RB87_HFS.gI) * RB87_HFS.muBHzPerG;
  return (g * g) / (2 * RB87_HFS.groundSplittingHz);
}

/** Slope dν/dB of the clock transition at field B, Hz/G. */
export function clockSensitivityHzPerG(bGauss: number): number {
  const x = breitRabiX(bGauss);
  const dxdB = breitRabiX(1);
  return RB87_HFS.groundSplittingHz * (x / Math.sqrt(1 + x * x)) * dxdB;
}

/** First-order Zeeman slope of |F, m_F⟩, Hz/G. */
export function linearZeemanHzPerG(F: number, mF: number): number {
  return landeGF(F) * mF * RB87_HFS.muBHzPerG;
}

/** Ratio of electron to nuclear magnetic moment magnitudes, |g_J J| / |g_I I|. */
export function electronToNuclearMomentRatio(): number {
  return (RB87_HFS.gJ * J) / Math.abs(RB87_HFS.gI * RB87_HFS.I);
}

/** Vector-model angle between I and J in the coupled state F, radians. */
export function couplingAngleRad(F: number): number {
  const I = RB87_HFS.I;
  const cos = (F * (F + 1) - I * (I + 1) - J * (J + 1)) / (2 * Math.sqrt(I * (I + 1) * J * (J + 1)));
  return Math.acos(Math.min(1, Math.max(-1, cos)));
}

/** Vector-model angle between F and its projection axis for magnetic quantum number m, radians. */
export function coneAngleRad(F: number, mF: number): number {
  return Math.acos(mF / Math.sqrt(F * (F + 1)));
}

/** Larmor precession frequency of |F⟩ in a field B, Hz. */
export function larmorHz(F: number, bGauss: number): number {
  return Math.abs(landeGF(F)) * RB87_HFS.muBHzPerG * bGauss;
}

/**
 * Ramsey contrast of an ensemble whose transition frequency is spread by a Gaussian of
 * standard deviation σ_ν (quasi-static noise): C(t) = exp(−(2π σ_ν t)² / 2).
 */
export function gaussianContrast(sigmaHz: number, tS: number): number {
  const a = 2 * Math.PI * sigmaHz * tS;
  return Math.exp(-(a * a) / 2);
}

/** 1/e time of that contrast decay. */
export function dephasingTimeS(sigmaHz: number): number {
  if (sigmaHz <= 0) return Infinity;
  return 1 / (Math.SQRT2 * Math.PI * sigmaHz);
}
