/** Closed-form atomic-physics relations used by the interactive boards.
 *  Every displayed number is computed here from the sliders or paper constants.
 */

export const RB87 = {
  hyperfineHz: 6.83468261090429e9,
  d1Nm: 794.978,
  d2Nm: 780.241,
  gammaD2Hz: 38.11e6,
  gammaD1Hz: 36.13e6,
  iNuclear: 1.5,
};

export function twoPhotonRabi(omega1: number, omega2: number, delta: number): number {
  return (omega1 * omega2) / (2 * delta);
}

/** Differential AC Stark of a far-detuned Raman pair, two-level estimate. */
export function ramanDifferentialStark(omega1: number, omega2: number, delta: number): number {
  return (omega1 * omega1 - omega2 * omega2) / (4 * delta);
}

/** Off-resonant scattering rate for a two-level atom, Γ Ω² / (4Δ²). */
export function scatteringRate(omega: number, gamma: number, delta: number): number {
  return (gamma * omega * omega) / (4 * delta * delta);
}

/** Two-level AC Stark δ_ac = Ω² / (4Δ). Sign follows Δ: red-detuned (Δ<0) is attractive. */
export function acStark(omega: number, delta: number): number {
  return (omega * omega) / (4 * delta);
}

/** van der Waals C₆ scaling ~ n¹¹ for alkali Rydberg S states (order-of-magnitude). */
export function rydbergC6Scale(n: number): number {
  return n ** 11;
}

export function blockadeRadius(c6: number, omegaRyd: number): number {
  if (omegaRyd <= 0) return 0;
  return (c6 / omegaRyd) ** (1 / 6);
}

/** Solovay–Kitaev-style angular spacing after N T gates in {H, T}. */
export function tGateAngularSpacingRad(tCount: number): number {
  if (tCount <= 0) return Math.PI;
  return Math.PI / 2 ** (tCount + 1);
}

export function surfaceLogicalError(p: number, d: number): number {
  const clipped = Math.min(Math.max(p, 1e-6), 0.4);
  return clipped ** ((d + 1) / 2);
}

export function hzToMHz(hz: number): number {
  return hz / 1e6;
}

export function mhzToHz(mhz: number): number {
  return mhz * 1e6;
}

/** One-sided geometric collection of an air objective, NA = sin θ. */
export function collectionNA(na: number): number {
  const clipped = Math.min(Math.max(na, 0), 0.999);
  return (1 - Math.cos(Math.asin(clipped))) / 2;
}

/** Rayleigh criterion: first Airy zero, 0.61 λ / NA. */
export function rayleighMetres(lambdaM: number, na: number): number {
  if (na <= 0) return Infinity;
  return (0.61 * lambdaM) / na;
}

export function poissonPmf(k: number, mu: number): number {
  if (mu <= 0) return k === 0 ? 1 : 0;
  let logP = -mu;
  for (let i = 1; i <= k; i += 1) logP += Math.log(mu) - Math.log(i);
  return Math.exp(logP);
}

export function poissonSample(mu: number, rand: () => number): number {
  if (mu <= 0) return 0;
  if (mu < 20) {
    const limit = Math.exp(-mu);
    let k = 0;
    let product = 1;
    do {
      k += 1;
      product *= rand();
    } while (product > limit && k < 200);
    return k - 1;
  }
  const u = Math.max(rand(), Number.EPSILON);
  const v = rand();
  const unitNormal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(0, Math.round(mu + Math.sqrt(mu) * unitNormal));
}
