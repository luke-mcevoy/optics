/**
 * Two-qubit state vectors and the gates, correlations and Bell-test quantities used by the
 * entanglement foundations page. Amplitudes are stored as [re, im] pairs in the order
 * |00⟩, |01⟩, |10⟩, |11⟩ (first label = qubit A).
 */
import type { Vec3 } from './qubit.ts';

export type Amp = readonly [number, number];
export type State = readonly [Amp, Amp, Amp, Amp];
export type Mat2 = readonly [Amp, Amp, Amp, Amp]; // row-major 2×2 complex

const Z: Amp = [0, 0];
export const KET00: State = [[1, 0], Z, Z, Z];

function mul(a: Amp, b: Amp): Amp {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}
function add(a: Amp, b: Amp): Amp {
  return [a[0] + b[0], a[1] + b[1]];
}
function conj(a: Amp): Amp {
  return [a[0], -a[1]];
}

export const H_GATE: Mat2 = [[Math.SQRT1_2, 0], [Math.SQRT1_2, 0], [Math.SQRT1_2, 0], [-Math.SQRT1_2, 0]];
export const X_GATE: Mat2 = [Z, [1, 0], [1, 0], Z];
export const Z_GATE: Mat2 = [[1, 0], Z, Z, [-1, 0]];

/** Rotation by angle θ about the equatorial axis at azimuth φ: exp(−i θ/2 (cos φ σx + sin φ σy)). */
export function rotEquatorial(theta: number, phi: number): Mat2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  // −i s (cos φ σx + sin φ σy) = [[0, −i s e^{−iφ}], [−i s e^{iφ}, 0]]
  return [[c, 0], [-s * Math.sin(phi), -s * Math.cos(phi)], [s * Math.sin(phi), -s * Math.cos(phi)], [c, 0]];
}

/** Rotation about y by θ (real matrix). */
export function rotY(theta: number): Mat2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [[c, 0], [-s, 0], [s, 0], [c, 0]];
}

/** Apply a single-qubit gate to qubit 0 (A) or 1 (B). */
export function apply1(state: State, u: Mat2, qubit: 0 | 1): State {
  const out: Amp[] = [Z, Z, Z, Z];
  for (let i = 0; i < 4; i += 1) {
    const bit = qubit === 0 ? i >> 1 : i & 1;
    const partner = qubit === 0 ? i ^ 2 : i ^ 1;
    const u0 = u[bit * 2 + bit]!; // u[bit][bit]
    const u1 = u[bit * 2 + (1 - bit)]!; // u[bit][1-bit]
    out[i] = add(mul(u0, state[i]!), mul(u1, state[partner]!));
  }
  return out as unknown as State;
}

export function cz(state: State): State {
  return [state[0], state[1], state[2], [-state[3][0], -state[3][1]]];
}

export function cnot(state: State): State {
  return [state[0], state[1], state[3], state[2]];
}

export function probabilities(state: State): [number, number, number, number] {
  return state.map((a) => a[0] * a[0] + a[1] * a[1]) as [number, number, number, number];
}

/** Bloch vector of the reduced state of one qubit (length < 1 when entangled). */
export function reducedBloch(state: State, qubit: 0 | 1): Vec3 {
  // ρ_q = Tr_other |ψ⟩⟨ψ|
  let r00 = 0;
  let r11 = 0;
  let r01: Amp = Z;
  for (let other = 0; other < 2; other += 1) {
    const i0 = qubit === 0 ? other : other << 1; // qubit = 0, other bit in position 1
    const i1 = qubit === 0 ? other | 2 : (other << 1) | 1;
    const a0 = state[i0]!;
    const a1 = state[i1]!;
    r00 += a0[0] * a0[0] + a0[1] * a0[1];
    r11 += a1[0] * a1[0] + a1[1] * a1[1];
    r01 = add(r01, mul(a0, conj(a1)));
  }
  return [2 * r01[0], -2 * r01[1], r00 - r11];
}

export function purityOf(r: Vec3): number {
  return (1 + r[0] * r[0] + r[1] * r[1] + r[2] * r[2]) / 2;
}

/** Bell state (|00⟩ + |11⟩)/√2. */
export const PHI_PLUS: State = [[Math.SQRT1_2, 0], Z, Z, [Math.SQRT1_2, 0]];

/**
 * Correlation E(a, b) = ⟨σ_a ⊗ σ_b⟩ for measurements along axes in the x–z plane at angles
 * θ_a, θ_b from z. Implemented by rotating each qubit by −θ about y and measuring z.
 */
export function correlation(state: State, thetaA: number, thetaB: number): number {
  const s = apply1(apply1(state, rotY(-thetaA), 0), rotY(-thetaB), 1);
  const p = probabilities(s);
  return p[0] - p[1] - p[2] + p[3];
}

/** Same for a mixture of pure states with weights. */
export function correlationMixed(parts: readonly { w: number; s: State }[], thetaA: number, thetaB: number): number {
  return parts.reduce((acc, p) => acc + p.w * correlation(p.s, thetaA, thetaB), 0);
}

/** Single-qubit outcome probability P(+1) along angle θ for qubit q, for a pure state. */
export function marginalPlus(state: State, qubit: 0 | 1, theta: number): number {
  const s = apply1(state, rotY(-theta), qubit);
  const p = probabilities(s);
  return qubit === 0 ? p[0] + p[1] : p[0] + p[2];
}

/** CHSH combination S = E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′). */
export function chsh(E: (a: number, b: number) => number, a: number, ap: number, b: number, bp: number): number {
  return E(a, b) - E(a, bp) + E(ap, b) + E(ap, bp);
}

/** Largest |S| any deterministic local strategy can reach (brute force over 16 assignments). */
export function classicalChshBound(): number {
  let best = 0;
  for (let m = 0; m < 16; m += 1) {
    const A = m & 1 ? 1 : -1;
    const Ap = m & 2 ? 1 : -1;
    const B = m & 4 ? 1 : -1;
    const Bp = m & 8 ? 1 : -1;
    best = Math.max(best, Math.abs(A * B - A * Bp + Ap * B + Ap * Bp));
  }
  return best;
}

/** Fidelity |⟨φ|ψ⟩|² between pure states. */
export function fidelity(a: State, b: State): number {
  let re = 0;
  let im = 0;
  for (let i = 0; i < 4; i += 1) {
    const p = mul(conj(a[i]!), b[i]!);
    re += p[0];
    im += p[1];
  }
  return re * re + im * im;
}

/**
 * Parity signal after a global π/2 analysis pulse of phase φ on both qubits:
 * Π(φ) = P00 + P11 − P01 − P10. For |Φ+⟩ it oscillates as −cos 2φ with unit amplitude.
 */
export function parity(state: State, phi: number): number {
  const u = rotEquatorial(Math.PI / 2, phi);
  const s = apply1(apply1(state, u, 0), u, 1);
  const p = probabilities(s);
  return p[0] + p[3] - p[1] - p[2];
}

/**
 * Bell-state fidelity estimate from populations and parity contrast,
 * F = (P00 + P11)/2 + C/2, where C is the amplitude of the parity oscillation.
 * Model state: ρ = f|Φ+⟩⟨Φ+| + (1 − f)·𝟙/4 (depolarised). Returns the exact quantities.
 */
export function depolarisedBellDiagnostics(f: number): { populations: number; contrast: number; fidelity: number } {
  // For ρ = f|Φ+⟩⟨Φ+| + (1−f) 𝟙/4: P00 + P11 = f + (1−f)/2; parity amplitude = f; F = f + (1−f)/4.
  const populations = f + (1 - f) / 2;
  const contrast = f;
  return { populations, contrast, fidelity: populations / 2 + contrast / 2 };
}
