/**
 * Gaussian-beam and collection-optics helpers used by the 3D apparatus figure.
 * Lengths in micrometres unless noted.
 */

/** Rayleigh range z_R = π w0² / λ. */
export function rayleighRangeUm(w0Um: number, lambdaUm: number): number {
  return (Math.PI * w0Um * w0Um) / lambdaUm;
}

/** 1/e² radius w(z) = w0 √(1 + (z/z_R)²). */
export function waistAtUm(zUm: number, w0Um: number, zRUm: number): number {
  const u = zUm / zRUm;
  return w0Um * Math.sqrt(1 + u * u);
}

/** Half-angle of the collection cone, θ = asin(NA) in air. Radians. */
export function collectionHalfAngle(na: number): number {
  return Math.asin(Math.min(1, na));
}

/** Fraction of isotropic emission inside a cone of half-angle θ: (1 − cos θ)/2. */
export function collectionFraction(na: number): number {
  return (1 - Math.cos(collectionHalfAngle(na))) / 2;
}

/**
 * Rydberg blockade radius R_b = (C6 / ħΩ)^{1/6}.
 * `c6OverHGHzUm6` is C6/h in GHz·μm⁶; `omegaMHz` is Ω/2π in MHz. Result in μm.
 */
export function blockadeRadiusUm(c6OverHGHzUm6: number, omegaMHz: number): number {
  return Math.pow((c6OverHGHzUm6 * 1e3) / omegaMHz, 1 / 6);
}

/**
 * Estimated C6/h for Rb nS₁/₂ pair states via the n*¹¹ scaling law anchored on the
 * published 70S value, C6/h ≈ 862 GHz·μm⁶ (Bernien et al., Nature 551, 579 (2017)).
 * This is NOT a number from the Bluvstein/Geim 2026 paper; treat it as an estimate.
 */
export function rbC6EstimateGHzUm6(n: number): number {
  const deltaS = 3.131;
  const nStar = n - deltaS;
  const nStar70 = 70 - deltaS;
  return 862 * Math.pow(nStar / nStar70, 11);
}
