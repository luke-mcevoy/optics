/**
 * Two-atom Rydberg blockade dynamics, solved numerically.
 * Units: ħ = 1, Ω = 1, so τ = Ωt is the pulse area and V is in units of Ω.
 */

/** Pulse area covered by one integration, rad. */
export const TAU_MAX = 8 * Math.PI;
/** Samples returned per curve. */
export const N_PTS = 800;

export type Curves = { gg: Float64Array; w: Float64Array; rr: Float64Array };

/**
 * Two atoms, resonant drive Ω on both, van der Waals shift V on |rr⟩.
 * Symmetric subspace (|gg⟩, |W⟩ = (|gr⟩+|rg⟩)/√2, |rr⟩), ħ = 1, Ω = 1:
 *   H = [[0, s, 0], [s, 0, s], [0, s, V]],  s = √2/2.
 * RK4 on i dψ/dτ = H ψ from ψ(0) = |gg⟩.
 */
export function integrateBlockade(v: number): Curves {
  const s = Math.SQRT1_2;
  const gg = new Float64Array(N_PTS);
  const w = new Float64Array(N_PTS);
  const rr = new Float64Array(N_PTS);
  // ψ = (re, im) for the three amplitudes
  const re = [1, 0, 0];
  const im = [0, 0, 0];
  // dψ/dτ = -i H ψ  ⇒  re' = H im, im' = -H re  (H real symmetric)
  const applyH = (ar: number[], ai: number[]): [number[], number[]] => {
    const hr = [
      s * (ar[1] ?? 0),
      s * ((ar[0] ?? 0) + (ar[2] ?? 0)),
      s * (ar[1] ?? 0) + v * (ar[2] ?? 0),
    ];
    const hi = [
      s * (ai[1] ?? 0),
      s * ((ai[0] ?? 0) + (ai[2] ?? 0)),
      s * (ai[1] ?? 0) + v * (ai[2] ?? 0),
    ];
    return [hi, hr.map((x) => -x)];
  };
  // Sample p sits at τ = p·TAU_MAX/(N_PTS−1), matching how the curves are plotted.
  const stepsPerSample = 6;
  const dt = TAU_MAX / ((N_PTS - 1) * stepsPerSample);
  for (let p = 0; p < N_PTS; p += 1) {
    gg[p] = (re[0] ?? 0) ** 2 + (im[0] ?? 0) ** 2;
    w[p] = (re[1] ?? 0) ** 2 + (im[1] ?? 0) ** 2;
    rr[p] = (re[2] ?? 0) ** 2 + (im[2] ?? 0) ** 2;
    for (let q = 0; q < stepsPerSample; q += 1) {
      const [k1r, k1i] = applyH(re, im);
      const [k2r, k2i] = applyH(
        re.map((x, j) => x + (dt / 2) * (k1r[j] ?? 0)),
        im.map((x, j) => x + (dt / 2) * (k1i[j] ?? 0)),
      );
      const [k3r, k3i] = applyH(
        re.map((x, j) => x + (dt / 2) * (k2r[j] ?? 0)),
        im.map((x, j) => x + (dt / 2) * (k2i[j] ?? 0)),
      );
      const [k4r, k4i] = applyH(
        re.map((x, j) => x + dt * (k3r[j] ?? 0)),
        im.map((x, j) => x + dt * (k3i[j] ?? 0)),
      );
      for (let j = 0; j < 3; j += 1) {
        re[j] =
          (re[j] ?? 0) +
          (dt / 6) * ((k1r[j] ?? 0) + 2 * (k2r[j] ?? 0) + 2 * (k3r[j] ?? 0) + (k4r[j] ?? 0));
        im[j] =
          (im[j] ?? 0) +
          (dt / 6) * ((k1i[j] ?? 0) + 2 * (k2i[j] ?? 0) + 2 * (k3i[j] ?? 0) + (k4i[j] ?? 0));
      }
    }
  }
  return { gg, w, rr };
}
