/**
 * Assumptions as data.
 *
 * AGENTS.md, "Never Hide Assumptions": every model in the kernel declares the
 * regime it is valid in, as structured data the agent and UI can surface
 * verbatim. These records are the canonical vocabulary; each module exports
 * the subset it relies on as `ASSUMPTIONS`.
 */

export interface Assumption {
  /** Stable machine id, e.g. `"paraxial"`. */
  readonly id: string;
  /** Short human label for UI chips. */
  readonly label: string;
  /** One sentence on what is assumed and when it breaks. */
  readonly detail: string;
}

const define = (id: string, label: string, detail: string): Assumption => ({ id, label, detail });

export const PARAXIAL = define(
  'paraxial',
  'Paraxial',
  'Rays and beams make small angles with the optical axis; sin(t) ~ tan(t) ~ t. Breaks down for fast beams (NA gtr ~0.3) and large field angles.',
);

export const THIN_LENS = define(
  'thin-lens',
  'Thin lens',
  'Lens thickness is neglected: refraction happens at a single plane. Model a thick lens as two curved interfaces separated by free space instead.',
);

export const TEM00 = define(
  'tem00',
  'TEM00 Gaussian',
  'The beam is a single fundamental Gaussian mode; higher-order content is folded into M^2 as a beam-quality factor only.',
);

export const SCALAR = define(
  'scalar',
  'Scalar field',
  'Field amplitude is treated as a scalar; vector/polarization effects are handled separately by the Jones layer and are not coupled to propagation.',
);

export const MONOCHROMATIC = define(
  'monochromatic',
  'Monochromatic',
  'A single vacuum wavelength; dispersion and finite linewidth are not modelled.',
);

export const HOMOGENEOUS_MEDIUM = define(
  'homogeneous-medium',
  'Homogeneous medium',
  'Refractive index is constant between elements; no gradient-index or thermal-lensing effects.',
);

export const IDEAL_SURFACE = define(
  'ideal-surface',
  'Ideal surface',
  'Surfaces are perfectly figured and centred; aberrations, scatter, and surface irregularity are not modelled.',
);

export const LOSSLESS_ELEMENT = define(
  'lossless-element',
  'Lossless element',
  'The polarization element is ideal and lossless (unitary Jones matrix) except where an explicit transmission is applied.',
);

export const IDEAL_POLARIZER = define(
  'ideal-polarizer',
  'Ideal polarizer',
  'Infinite extinction ratio and unity transmission along the pass axis; real components have finite extinction.',
);

export const FULLY_POLARIZED = define(
  'fully-polarized',
  'Fully polarized',
  'The Jones formalism describes fully polarized light only; degree of polarization is 1 by construction (use Mueller/coherency matrices for partial polarization).',
);

export const GAUSSIAN_FIBER_MODE = define(
  'gaussian-fiber-mode',
  'Gaussian fiber mode',
  'The fiber LP01 mode is approximated by a Gaussian of waist w0 = MFD/2; accurate to a few percent near the design wavelength for step-index SM fiber.',
);

export const COMMON_PLANE_OVERLAP = define(
  'common-plane-overlap',
  'Common-plane overlap',
  'Coupling is the mode-overlap integral of the two fields evaluated at one common transverse plane (the fiber facet), with no Fresnel or endface reflection.',
);

export const NO_APERTURE_CLIPPING = define(
  'no-aperture-clipping',
  'No aperture clipping',
  'Elements are assumed large enough to pass the beam unvignetted; clear-aperture checks are applied separately.',
);

export const INCOHERENT_POWER_BUDGET = define(
  'incoherent-power-budget',
  'Multiplicative power budget',
  'Power is a scalar product of per-element transmissions; interference between paths and nonlinear/saturation effects are not modelled.',
);

/** Every assumption defined by the kernel, keyed by id. */
export const ALL_ASSUMPTIONS: Readonly<Record<string, Assumption>> = Object.freeze(
  Object.fromEntries(
    [
      PARAXIAL,
      THIN_LENS,
      TEM00,
      SCALAR,
      MONOCHROMATIC,
      HOMOGENEOUS_MEDIUM,
      IDEAL_SURFACE,
      LOSSLESS_ELEMENT,
      IDEAL_POLARIZER,
      FULLY_POLARIZED,
      GAUSSIAN_FIBER_MODE,
      COMMON_PLANE_OVERLAP,
      NO_APERTURE_CLIPPING,
      INCOHERENT_POWER_BUDGET,
    ].map((a) => [a.id, a]),
  ),
);
