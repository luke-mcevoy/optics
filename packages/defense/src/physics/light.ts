/**
 * Light–atom interaction helpers: polarizability, dipole traps (Grimm, Weidemüller &
 * Ovchinnikov, Adv. At. Mol. Opt. Phys. 42, 95 (2000)), Raman scaling and angular-momentum
 * selection rules. SI units unless stated. Standard ⁸⁷Rb data from Steck.
 */

export const C = 299792458;
export const HBAR = 1.054571817e-34;
export const H = 6.62607015e-34;
export const KB = 1.380649e-23;
export const AMU = 1.66053906660e-27;
export const RB87_MASS = 86.909180527 * AMU;

export const RB_LINES = {
  d2: { lambdaM: 780.241209e-9, gamma: 2 * Math.PI * 6.0666e6, weight: 2 / 3 },
  d1: { lambdaM: 794.978851e-9, gamma: 2 * Math.PI * 5.7500e6, weight: 1 / 3 },
} as const;

export function omegaOf(lambdaM: number): number {
  return (2 * Math.PI * C) / lambdaM;
}

/**
 * Two-level complex polarizability in units of its resonant imaginary value, as a function
 * of detuning in linewidths. Re > 0 (dipole in phase) for red detuning.
 */
export function twoLevelPolarizability(deltaOverGamma: number): { re: number; im: number } {
  const d = deltaOverGamma;
  const den = d * d + 0.25;
  return { re: -d / den / 2, im: 0.25 / den };
}

/** Peak intensity of a Gaussian beam of power P and waist w0, W/m². */
export function peakIntensity(powerW: number, w0M: number): number {
  return (2 * powerW) / (Math.PI * w0M * w0M);
}

/**
 * Dipole potential (J) for linearly polarised light of intensity I at wavelength λ on the
 * ⁸⁷Rb ground state, summing the D1 and D2 lines with their line strengths and keeping the
 * counter-rotating term. Negative = attractive (red-detuned).
 */
export function dipolePotentialJ(lambdaM: number, intensity: number): number {
  const w = omegaOf(lambdaM);
  let u = 0;
  for (const line of [RB_LINES.d2, RB_LINES.d1]) {
    const w0 = omegaOf(line.lambdaM);
    const delta = w - w0;
    u += line.weight * ((3 * Math.PI * C * C * line.gamma) / (2 * w0 ** 3)) * (1 / delta - 1 / (w + w0)) * intensity;
  }
  return u;
}

/** Photon scattering rate (s⁻¹) for the same light, same conventions. */
export function scatteringRateHz(lambdaM: number, intensity: number): number {
  const w = omegaOf(lambdaM);
  let g = 0;
  for (const line of [RB_LINES.d2, RB_LINES.d1]) {
    const w0 = omegaOf(line.lambdaM);
    const delta = w - w0;
    const bracket = 1 / delta - 1 / (w + w0);
    g += line.weight * ((3 * Math.PI * C * C * line.gamma * line.gamma) / (2 * HBAR * w0 ** 3)) * (w / w0) ** 3 * bracket * bracket * intensity;
  }
  return g;
}

export type TrapSummary = {
  depthJ: number;
  depthMK: number;
  depthMHz: number;
  scatteringHz: number;
  radialHz: number;
  axialHz: number;
  rayleighM: number;
};

/** Everything about a Gaussian-beam tweezer of power P, waist w0, wavelength λ. */
export function tweezer(lambdaM: number, powerW: number, w0M: number): TrapSummary {
  const I0 = peakIntensity(powerW, w0M);
  const u = dipolePotentialJ(lambdaM, I0);
  const depth = Math.abs(u);
  const zR = (Math.PI * w0M * w0M) / lambdaM;
  const radial = u < 0 ? Math.sqrt((4 * depth) / (RB87_MASS * w0M * w0M)) / (2 * Math.PI) : 0;
  const axial = u < 0 ? Math.sqrt((2 * depth) / (RB87_MASS * zR * zR)) / (2 * Math.PI) : 0;
  return {
    depthJ: u,
    depthMK: (u / KB) * 1e3,
    depthMHz: u / H / 1e6,
    scatteringHz: scatteringRateHz(lambdaM, I0),
    radialHz: radial,
    axialHz: axial,
    rayleighM: zR,
  };
}

/** Raman: photons scattered per π pulse is π Γ / (2|Δ|), independent of the beam power. */
export function ramanPhotonsPerPi(gammaRad: number, deltaRad: number): number {
  return (Math.PI * gammaRad) / (2 * Math.abs(deltaRad));
}

/* ------------------------------------------------------------ angular momentum */

function fact(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i += 1) f *= i;
  return f;
}

/** Clebsch–Gordan coefficient ⟨j1 m1 j2 m2 | J M⟩ (Racah formula; small integer/half-integer spins). */
export function clebschGordan(j1: number, m1: number, j2: number, m2: number, J: number, M: number): number {
  if (Math.abs(m1 + m2 - M) > 1e-9) return 0;
  if (J < Math.abs(j1 - j2) || J > j1 + j2) return 0;
  if (Math.abs(m1) > j1 || Math.abs(m2) > j2 || Math.abs(M) > J) return 0;
  const pre =
    ((2 * J + 1) * fact(J + j1 - j2) * fact(J - j1 + j2) * fact(j1 + j2 - J)) / fact(j1 + j2 + J + 1);
  const pre2 = fact(J + M) * fact(J - M) * fact(j1 - m1) * fact(j1 + m1) * fact(j2 - m2) * fact(j2 + m2);
  let sum = 0;
  for (let k = 0; k <= 20; k += 1) {
    const a = j1 + j2 - J - k;
    const b = j1 - m1 - k;
    const c = j2 + m2 - k;
    const d = J - j2 + m1 + k;
    const e = J - j1 - m2 + k;
    if (a < 0 || b < 0 || c < 0 || d < 0 || e < 0) continue;
    sum += ((-1) ** k) / (fact(k) * fact(a) * fact(b) * fact(c) * fact(d) * fact(e));
  }
  return Math.sqrt(pre * pre2) * sum;
}

/** Relative transition strength F, mF → F′, mF′ = mF + q for polarisation q ∈ {−1, 0, +1}. */
export function lineStrength(F: number, mF: number, q: number, Fp: number): number {
  const cg = clebschGordan(F, mF, 1, q, Fp, mF + q);
  return cg * cg;
}

/**
 * Rate-equation step for optical pumping F → F′ with polarisation q, returning new ground
 * populations. Each ground sublevel absorbs at a rate ∝ its line strength and the excited
 * sublevel decays back with branching ∝ CG². dt in units of the absorption rate.
 */
export function pumpStep(pop: readonly number[], F: number, Fp: number, q: number, dt: number): { pop: number[]; scattered: number } {
  const out = pop.slice();
  let scattered = 0;
  for (let i = 0; i < pop.length; i += 1) {
    const m = i - F;
    const mp = m + q;
    if (Math.abs(mp) > Fp) continue;
    const rate = lineStrength(F, m, q, Fp) * dt;
    const moved = Math.min(pop[i] ?? 0, (pop[i] ?? 0) * rate);
    if (moved <= 0) continue;
    out[i] = (out[i] ?? 0) - moved;
    scattered += moved;
    // decay F′ m′ → F m″ with m″ = m′ − q′
    let norm = 0;
    const branches: number[] = [];
    for (const qq of [-1, 0, 1]) {
      const mpp = mp - qq;
      const s = Math.abs(mpp) <= F ? lineStrength(F, mpp, qq, Fp) : 0;
      branches.push(s);
      norm += s;
    }
    [-1, 0, 1].forEach((qq, k) => {
      const mpp = mp - qq;
      if (Math.abs(mpp) > F || norm === 0) return;
      const j = mpp + F;
      out[j] = (out[j] ?? 0) + (moved * (branches[k] ?? 0)) / norm;
    });
  }
  return { pop: out, scattered };
}
