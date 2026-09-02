/**
 * Single-qubit kinematics: Bloch vectors, Rabi and Ramsey formulas, pure vs mixed states.
 * Angles in radians, frequencies as angular frequencies unless the name says otherwise.
 */

export type Vec3 = readonly [number, number, number];

/** Bloch vector of cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩, with |0⟩ at the north pole. */
export function blochFromAngles(theta: number, phi: number): Vec3 {
  return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
}

/** Probability of measuring |1⟩ for that state. */
export function p1FromTheta(theta: number): number {
  return Math.sin(theta / 2) ** 2;
}

/** Generalised Rabi frequency Ω' = √(Ω² + Δ²). */
export function generalisedRabi(omega: number, delta: number): number {
  return Math.hypot(omega, delta);
}

/** P(|1⟩) after driving |0⟩ for time t with Rabi frequency Ω and detuning Δ. */
export function rabiP1(omega: number, delta: number, t: number): number {
  const op = generalisedRabi(omega, delta);
  if (op === 0) return 0;
  return ((omega * omega) / (op * op)) * Math.sin((op * t) / 2) ** 2;
}

/**
 * Bloch vector during a detuned drive starting from |0⟩: rotation about the axis
 * (Ω, 0, Δ)/Ω' at rate Ω'. Convention: the drive is along +x in the rotating frame.
 */
export function drivenBloch(omega: number, delta: number, t: number): Vec3 {
  const op = generalisedRabi(omega, delta);
  if (op === 0) return [0, 0, 1];
  const ax = omega / op;
  const az = delta / op;
  const c = Math.cos(op * t);
  const s = Math.sin(op * t);
  // Rodrigues rotation of v = (0,0,1) about k = (ax, 0, az): v c + (k×v) s + k (k·v)(1−c).
  return [ax * az * (1 - c), -ax * s, c + az * az * (1 - c)];
}

/** Ramsey signal: P(|1⟩) after π/2 – free evolution T at detuning δ – π/2. */
export function ramseyP1(delta: number, tFree: number): number {
  return Math.cos((delta * tFree) / 2) ** 2;
}

/** Expectation values ⟨σx⟩, ⟨σy⟩, ⟨σz⟩ of a Bloch vector are its components; purity is |r|². */
export function purity(r: Vec3): number {
  const l2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
  return (1 + l2) / 2;
}

/** Probability of the +1 outcome when measuring along unit axis n for Bloch vector r. */
export function pPlusAlong(r: Vec3, n: Vec3): number {
  return (1 + r[0] * n[0] + r[1] * n[1] + r[2] * n[2]) / 2;
}

/** Average Bloch vector of an equal mixture of the given pure states. */
export function mixture(states: readonly Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const s of states) {
    x += s[0] / states.length;
    y += s[1] / states.length;
    z += s[2] / states.length;
  }
  return [x, y, z];
}
