/**
 * Minimal complex arithmetic. Zero dependencies, plain-number components.
 *
 * Complex numbers are used for the Gaussian q parameter (SI metres) and for
 * Jones vectors/matrices (dimensionless field amplitudes). They are *not*
 * branded: unit-carrying values are converted to SI at the API boundary.
 */

export interface Complex {
  readonly re: number;
  readonly im: number;
}

export const c = (re: number, im = 0): Complex => ({ re, im });

export const ZERO: Complex = c(0, 0);
export const ONE: Complex = c(1, 0);
export const I: Complex = c(0, 1);

export const cAdd = (a: Complex, b: Complex): Complex => c(a.re + b.re, a.im + b.im);
export const cSub = (a: Complex, b: Complex): Complex => c(a.re - b.re, a.im - b.im);
export const cMul = (a: Complex, b: Complex): Complex =>
  c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cScale = (a: Complex, k: number): Complex => c(a.re * k, a.im * k);
export const cNeg = (a: Complex): Complex => c(-a.re, -a.im);
export const cConj = (a: Complex): Complex => c(a.re, -a.im);

/** |z|^2 — squared modulus. */
export const cAbs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
/** |z| — modulus. */
export const cAbs = (a: Complex): number => Math.hypot(a.re, a.im);
/** arg(z) in radians, in (-pi, pi]. */
export const cArg = (a: Complex): number => Math.atan2(a.im, a.re);

export const cDiv = (a: Complex, b: Complex): Complex => {
  const d = cAbs2(b);
  if (d === 0) throw new Error('complex division by zero');
  return c((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};

/** 1/z. */
export const cInv = (a: Complex): Complex => cDiv(ONE, a);

/** e^z. */
export const cExp = (a: Complex): Complex => {
  const r = Math.exp(a.re);
  return c(r * Math.cos(a.im), r * Math.sin(a.im));
};

export const cEq = (a: Complex, b: Complex, tol = 1e-12): boolean =>
  Math.abs(a.re - b.re) <= tol && Math.abs(a.im - b.im) <= tol;
