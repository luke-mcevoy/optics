export type LiveKind = 'beam' | 'jones' | 'zeeman' | 'photons';

export interface WorkLink {
  readonly label: string;
  readonly href: string;
}

export interface Work {
  readonly slug: string;
  readonly title: string;
  readonly kicker: string;
  readonly year: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly body: readonly string[];
  readonly featured?: boolean;
  readonly live?: LiveKind;
  readonly status: 'live' | 'instrument' | 'paper' | 'sketch';
  readonly links?: readonly WorkLink[];
  readonly assumptions?: readonly string[];
  /** Internal route that hosts this piece, when it isn't a generic work page. */
  readonly page?: string;
}

/**
 * The catalog is the contract. A new visualization is one entry here plus,
 * if it runs on this site, a `live` kind handled in `pages/Work.tsx`.
 */
export const WORKS: readonly Work[] = [
  {
    slug: 'phd',
    title: 'The PhD, as a running instrument',
    kicker: 'Live · dissertation',
    year: '2026',
    tags: ['single-photon', 'LiDAR', 'reconstruction'],
    summary:
      'Physics-Informed Sparse Single Photon 3D Imaging (Stevens, 2026), visualized end to end: Poisson photon budgets, physical MEMS masking with a live biharmonic solve, QPMS mode counting, and the VideoPIMAE speed-up curve.',
    body: [],
    featured: true,
    status: 'live',
    page: '/phd',
  },
  {
    slug: 'mhs-quera',
    title: 'Teaching an AI to hold a laser lock',
    kicker: 'Fieldwork · QuEra × Anthropic',
    year: '2026',
    tags: ['quantum', 'lasers', 'AI agents'],
    summary:
      'Core team on QuEra Computing\u2019s laser-stabilization pilot under Anthropic\u2019s Model Hardware Standard: an AI agent locks and tunes the lasers of a neutral-atom quantum computer. Lock recovery went from 58% to 99.3%, recovery time from ~150 s to ~6 s, across 700 blind trials.',
    body: [
      'Anthropic\u2019s Model Hardware Standard (MHS) lets AI agents interact with physical hardware and run experiments. QuEra\u2019s pilot pointed it at laser locking \u2014 keeping lasers at the precise frequencies a neutral-atom quantum computer needs to operate.',
      'I worked across MHS integration and the laser systems. Measured results: lock recovery improved from 58% to 99.3%, and recovery time dropped from ~150 seconds to ~6 seconds, proven across 700 blind trials.',
    ],
    featured: true,
    status: 'instrument',
    links: [
      {
        label: 'QuEra: Holding the Light',
        href: 'https://www.quera.com/blog-posts/holding-the-light-teaching-an-ai-to-lock-and-tune-our-quantum-computers-lasers',
      },
      {
        label: 'Anthropic: MHS research preview',
        href: 'https://www.anthropic.com/news/model-hardware-standard-research-preview',
      },
    ],
  },
  {
    slug: 'focus',
    title: 'Where a Gaussian beam focuses',
    kicker: 'Live · kernel',
    year: '2026',
    tags: ['optics', 'Gaussian beams', 'ABCD'],
    summary:
      'A collimated TEM00 beam through a thin lens. The waist position and radius are computed from the complex q-parameter, not drawn by hand.',
    body: [
      'A collimated Gaussian is not a cylinder of light. Its wavefronts are flat at a waist, and a thin lens of focal length f maps the incoming q onto a new beam whose waist sits near f — exactly at f only in the geometric limit w ≫ w₀′.',
      'Drag focal length and wavelength. The envelope is w(z) from the kernel; the marked waist is −Re(q′) after the lens, and w₀′ follows from Im(q′).',
    ],
    featured: true,
    live: 'beam',
    status: 'live',
    assumptions: [
      'Paraxial, TEM00, M² = 1, n = 1',
      'Thin-lens ABCD [[1, 0], [−1/f, 1]]',
      'Incoming beam collimated (R = ∞) at the lens',
    ],
  },
  {
    slug: 'circular',
    title: 'Linear into circular',
    kicker: 'Live · Jones',
    year: '2026',
    tags: ['polarization', 'Jones', 'waveplates'],
    summary:
      'A quarter-wave plate at 45° to horizontal input is circular. The ellipse, Stokes S₃, and handedness are evaluated from the Jones calculus in the kernel.',
    body: [
      'Jones vectors carry amplitude and phase. A quarter-wave plate with fast axis at θ applies a π/2 retardance in that basis. At θ = 45° to a horizontal input the two components are equal in amplitude and in quadrature — circular polarization.',
      'S₃ / S₀ is the degree of circularity: ±1 is circular, 0 is linear. The sign is the kernel’s optics convention (S₃ > 0 is left-circular, looking into the beam).',
    ],
    featured: true,
    live: 'jones',
    status: 'live',
    assumptions: [
      'Fully polarized, monochromatic field',
      'Ideal lossless waveplate (unitary Jones matrix)',
      'Handedness follows the kernel Stokes convention',
    ],
  },
  {
    slug: 'zeeman',
    title: 'Zeeman splitting',
    kicker: 'Live · textbook model',
    year: '2026',
    tags: ['atomic physics', 'magnetic fields'],
    summary:
      'Orbital Zeeman effect for a p-state: three mℓ sublevels fan with B. The gap is μB B, using the Bohr magneton as a fixed constant.',
    body: [
      'In the orbital Zeeman effect (LS decoupled, no hyperfine structure) an orbital magnetic moment couples to B as ΔE = μB mℓ B, with gℓ = 1. A p-state (ℓ = 1) therefore splits into mℓ = −1, 0, +1.',
      'This is the textbook linear Zeeman diagram, not a fine-structure or alkali D-line calculation. Hyperfine and Paschen–Back physics are out of scope here.',
    ],
    live: 'zeeman',
    status: 'live',
    assumptions: [
      'Orbital Zeeman only: ΔE = μB mℓ B',
      'ℓ = 1, gℓ = 1, no spin, no hyperfine',
      'μB = 5.788 × 10⁻⁵ eV/T (CODATA)',
    ],
  },
  {
    slug: 'photons',
    title: 'A handful of photons',
    kicker: 'Live · illustration',
    year: '2026',
    tags: ['single-photon', 'imaging', 'PI-MAE'],
    summary:
      'What a letter looks like when you only keep a few detected photons, then a Gaussian kernel-density reconstruction. An illustration of the regime PI-MAE addresses — not the network in the paper.',
    body: [
      'Single-photon imaging often has to form a picture from a sparse, noisy point process. This sketch drops Poisson-sampled hits on a fixed glyph and reconstructs a density with a Gaussian kernel. That is not PI-MAE; it is the visual problem the paper is about.',
      'Physics-Informed Masked Autoencoder for Active Sparse Imaging (Scientific Reports, 2024) reconstructs images from a hardware-masked single-photon LiDAR, down to on the order of nine detected photons per pixel at 90% physical masking.',
    ],
    featured: true,
    live: 'photons',
    status: 'sketch',
    links: [
      {
        label: 'Paper (Scientific Reports)',
        href: 'https://www.nature.com/articles/s41598-024-71095-x',
      },
      { label: 'The dissertation, visualized', href: '/phd' },
    ],
    assumptions: [
      'Hits are an inhomogeneous Poisson process on a fixed glyph',
      'Reconstruction is Gaussian KDE, not the PI-MAE network',
      'Shown to make the photon-starved regime visible',
    ],
  },
  {
    slug: 'optics-studio',
    title: 'Optics Studio',
    kicker: 'Instrument',
    year: '2026',
    tags: ['optics', 'Gaussian beams', 'agent'],
    summary:
      'A conversational optical bench: an agent drives a deterministic in-browser kernel — ABCD, Jones, fiber overlap — so every number in the explanation is computed.',
    body: [
      'The long-term object is an agent that can design an optical system against a scientific spec. The path there is a bench you can talk to: place a lens, propagate, measure the waist, sweep focal length, and read the derivation with the current values substituted.',
      'The physics lives in a pure TypeScript kernel. Elements are registry data (ABCD, Jones, transmission, aperture), not one-off propagation code. This site’s focus and polarization boards are the same kernel.',
    ],
    featured: true,
    status: 'live',
    links: [{ label: 'Open the bench', href: '/studio/' }],
    assumptions: ['Paraxial Gaussian / Jones v1 models', 'No claim of experimental validation'],
  },
  {
    slug: 'neutral-atoms',
    title: 'Fault-tolerant neutral atoms',
    kicker: 'Walkthrough',
    year: '2026',
    tags: ['quantum', 'neutral atoms', 'error correction'],
    summary:
      'A chaptered, interactive defense of Bluvstein, Geim et al., Nature 649, 39–46 (2026) — the Harvard–MIT CUA architecture, with live boards for levels, blockade, holography, and the zoned processor.',
    body: [
      'Fourteen chapters from ⁸⁷Rb structure through Raman and Rydberg control, SLM tweezers, AOD shuttling, the five-AWG pulse rack, surface-code loss, and constant-entropy teleportation.',
      'Displayed numbers are paper-cited or evaluated from named formulas. Slider models that are not paper fits are labeled as such.',
    ],
    featured: true,
    status: 'live',
    links: [
      { label: 'Open the walkthrough', href: '/defense/' },
      { label: 'Nature paper', href: 'https://doi.org/10.1038/s41586-025-09848-5' },
    ],
  },
  {
    slug: 'pi-mae',
    title: 'PI-MAE',
    kicker: 'Paper',
    year: '2024',
    tags: ['single-photon', 'LiDAR', 'deep learning'],
    summary:
      'Physics-Informed Masked Autoencoder for Active Sparse Imaging. Hardware-masked single-photon LiDAR; reconstruction at extreme sparsity.',
    body: [
      'With 1.8 × 10⁻⁶ or fewer detected photons per pulse and down to nine detected photons per pixel, PI-MAE reconstructs unseen object classes under 90% physical masking on a single-photon LiDAR.',
      'Authors: Luke McEvoy, Daniel Tafone, Yong Meng Sua, Yuping Huang. Scientific Reports (2024).',
    ],
    status: 'paper',
    links: [
      {
        label: 'Scientific Reports',
        href: 'https://www.nature.com/articles/s41598-024-71095-x',
      },
      { label: 'Companion sketch', href: '/work/photons' },
      { label: 'The dissertation, visualized', href: '/phd' },
    ],
  },
  {
    slug: 'orders',
    title: 'Orders of magnitude',
    kicker: 'Instrument',
    year: '2026',
    tags: ['visualization', 'physics', 'scale'],
    summary:
      'A continuous logarithmic zoom through 62 orders of magnitude, from the Planck length to the particle horizon. Every length on screen is a measured quantity.',
    body: [
      'One canvas, one axis: powers of ten. The camera glides from 10⁻³⁵ m to the edge of the observable universe, and every object placed along the way carries its actual measured size — no artistic license on the exponents.',
      'Built as a framework-free TypeScript canvas app with a guided journey mode.',
    ],
    status: 'live',
    links: [{ label: 'Open the zoom', href: '/orders/' }],
  },
  {
    slug: 'usage',
    title: 'Usage',
    kicker: 'Instrument',
    year: '2026',
    tags: ['tooling', 'agents', 'routing'],
    summary:
      'A local router for the AI subscriptions you already pay for. An `ai` command dispatches coding tasks to whichever agent still has quota; a dashboard shows remaining windows, the next routing decision, and why.',
    body: [
      'Claude, Codex, Gemini, and Cursor quotas tracked locally; dispatch picks the highest-priority agent within limits and remembers which agent finishes which kind of task. An OpenAI-compatible gateway does the same for chat.',
      'Python standard library only. Nothing leaves the machine except to the vendor you already pay. Much of this site was built through it.',
    ],
    status: 'instrument',
  },
  {
    slug: 'wine-journeys',
    title: "Dad's Wine Journeys",
    kicker: 'Instrument',
    year: '2026',
    tags: ['visualization', 'globe', 'photography'],
    summary:
      'A 3D globe of every vineyard visited, detected from photos: EXIF GPS matched against real vineyards in OpenStreetMap, plotted with a cinematic flythrough and timeline.',
    body: [
      'Photos are read entirely on-device. GPS clusters are matched to landuse=vineyard / craft=winery features within ~250 m via the Overpass API, then grouped into visited places on a globe.',
      'Phase 1 is a fully client-side web MVP; phase 2 ports the detection to native iOS (PhotoKit + MapKit).',
    ],
    status: 'live',
    links: [{ label: 'Open the globe', href: '/wine/' }],
  },
  {
    slug: 'elder-law',
    title: 'Elder-law prospecting dashboard',
    kicker: 'Instrument',
    year: '2026',
    tags: ['data', 'maps', 'Next.js'],
    summary:
      'A Next.js dashboard that maps public data sources into a prospecting view for an elder-law practice, with projected geospatial layers.',
    body: [
      'Public records are normalized into one geographic picture — proj4-projected layers over the practice area, backed by documented data sources.',
    ],
    status: 'instrument',
  },
  {
    slug: 'language-globe',
    title: 'Language Globe',
    kicker: 'Instrument',
    year: '2026',
    tags: ['visualization', 'language', 'audio'],
    summary:
      'A 3D Earth of 1,400+ live radio stations. Karaoke captions with word-level timing, click-to-translate, and quizzes generated from whatever is on the air.',
    body: [
      'Pins are real streams, colored by talk or music. Captions prefer whisper.cpp with DTW token timestamps; quizzes and translations prefer a local Ollama model. The whole loop can run with no API key.',
    ],
    status: 'instrument',
  },
  {
    slug: 'travel-timeline',
    title: 'Travel Timeline',
    kicker: 'Instrument',
    year: '2026',
    tags: ['visualization', 'globe', 'photography'],
    summary:
      'Apple Photos in, cinematic satellite-globe flythrough out. Trips, places, and one photograph per stop, inferred from the library.',
    body: [
      'The library is clustered by time and place; each stay keeps a single photograph. The playback is a satellite globe with route arcs — and a pullback that measures the whole journey against the Earth–Moon distance.',
    ],
    status: 'instrument',
  },
  {
    slug: 'single-photon-challenge',
    title: 'Single Photon Challenge',
    kicker: 'Pipeline',
    year: '2025',
    tags: ['single-photon', 'reconstruction', 'PyTorch'],
    summary:
      'A PyTorch reconstruction pipeline for the Single Photon Challenge: inspection, baselines, ablations, and submission artifacts on Apple Silicon.',
    body: [
      'Loaders cover synthetic photon cubes and the challenge packed format. The point of the repo is a repeatable train / benchmark / submit loop, not a one-off notebook.',
    ],
    status: 'instrument',
  },
  {
    slug: 'typewriter',
    title: 'Typewriter photographs',
    kicker: 'Instrument',
    year: '2025',
    tags: ['imaging', 'halftone'],
    summary:
      'Photographs rendered as typewriter strikes — a constrained, physical halftone rather than a font-art filter.',
    body: [
      'An uploaded image is tone-mapped onto a strike density the carriage can actually type. The output is meant to be typed, not only previewed.',
    ],
    status: 'instrument',
  },
];

export function workBySlug(slug: string): Work | undefined {
  return WORKS.find((w) => w.slug === slug);
}

export function featuredWorks(): readonly Work[] {
  return WORKS.filter((w) => w.featured === true);
}
