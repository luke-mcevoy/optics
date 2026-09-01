/**
 * Grounded quantities from the dissertation:
 * McEvoy, "Physics-Informed Sparse Single Photon 3D Imaging",
 * Ph.D. thesis, Stevens Institute of Technology, 2026.
 *
 * Every number here is either quoted from the thesis text/tables or is a
 * closed-form expression the thesis states (e.g. N = pi*B*T/2). Live boards
 * may additionally compute values in the browser; those are labeled as such.
 */

export const THESIS = {
  title: 'Physics-Informed Sparse Single Photon 3D Imaging',
  author: 'Luke McEvoy',
  school: 'Stevens Institute of Technology, Department of Physics',
  year: 2026,
  advisor: 'Yuping Huang',
  committee: ['Yuping Huang (chair)', 'Yong Meng Sua', 'Rainer Martini', 'Hong Man'],

  /** Laser / scan platform (thesis Ch. 2–3, Table 3.1). */
  laser: {
    repRateHz: 50e6,
    pulsePs: 6,
    grid: 32,
    memsResolutionDeg: 0.28,
  },

  /** Deeply photon-starved operating points (thesis Sec. 1.4, Table 2.1). */
  operatingPoints: {
    pimaeDetPerPulse: 1.86e-6,
    qpmsDetPerPulse: 6e-4,
  },

  /** PI-MAE photon budget, Table 2.1 (90% masking, numbers scene). */
  pimae: {
    maskPct: 90,
    visiblePatches: 26,
    totalPatches: 256,
    photonsPerTotalPx: 9.1,
    photonsPerUsedPx: 89.4,
  },

  /** QPMS detector vs direct InGaAs (thesis Ch. 3, Table 3.1, Figs. 3.8–3.9). */
  qpms: {
    ingaas: { gateS: 1e-9, bandHz: 250e9, modes: 392, jitter: '~500 ps', darkHz: 1000 },
    qpms: { gateS: 6e-12, bandHz: 90e9, jitter: '~9 ps', darkHz: 250 },
    suppressionDb: { modeCount: 25.9, polarization: 3.0, intrinsic: 7.1, total: 36 },
    eta1: 0.84,
    s12QpmsDb: 11.3,
    s12TfDb: 2.4,
    eta2Tf: 0.48,
    eta2Qpms: 0.062,
    depthResolution: '0.9 mm single-shot',
    depthAccuracy: '±0.09 mm averaged',
    noiseToSignal: 34,
  },

  /**
   * VideoPIMAE multi-scene averages, unified magma-image space
   * (thesis Table 5.1 / Table 6.1; 4 dynamic scenes, 16 frames each).
   */
  videopimae: [
    { maskPct: 75, speedup: 4, psnrDb: 17.54, ssim: 0.578 },
    { maskPct: 90, speedup: 10, psnrDb: 15.93, ssim: 0.482 },
    { maskPct: 95, speedup: 20, psnrDb: 14.1, ssim: 0.403 },
    { maskPct: 98, speedup: 50, psnrDb: 11.62, ssim: 0.258 },
  ],

  /** Static-scene references in the same unified magma space (Table 5.1). */
  unifiedStatic: {
    pat: { psnrDb: 17.37, ssim: 0.709 },
    biharmonic: { psnrDb: 16.95, ssim: 0.677 },
    sparseInput: { psnrDb: 10.49, ssim: 0.484 },
  },

  chapters: [
    { n: 1, title: 'Imaging in photon-limited regimes', note: 'Sparsity, Poisson statistics, Cramér–Rao depth limits.' },
    { n: 2, title: 'Physics-Informed Masked Autoencoder', note: 'Condition an MAE on the physical MEMS mask; 9.1 photons per total pixel.' },
    { n: 3, title: 'Quantum Parametric Mode Sorting', note: 'Mode-selective upconversion; 36 dB noise advantage (inherited platform).' },
    { n: 4, title: 'Physics-Aware Transformers', note: 'Occlusion masks from time-of-flight histograms; reconstruct hidden surfaces.' },
    { n: 5, title: 'Biharmonic inpainting', note: 'Training-free Δ²u = 0 solve; <10 ms per frame, close to PAT.' },
    { n: 6, title: 'VideoPIMAE', note: 'Zero-shot spacetime masking; useful at 4–10×, stress-tested at 50×.' },
    { n: 7, title: 'Summary', note: 'Joint hardware–software design beats the photon budget.' },
  ],
} as const;

/** Time–frequency mode count N = pi*B*T/2 (thesis Eq. 3.7.1). */
export function modeCount(bandHz: number, gateS: number): number {
  return (Math.PI * bandHz * gateS) / 2;
}
