/**
 * One experimental run, as the instruments see it.
 *
 * The 3D optical table (viz/Instrument3D) and the rack timeline drawn under it both read
 * this file, so what lights up in the scene and what the timeline says are the same fact.
 * Phase order and the hardware named in each phase follow the paper's Methods; the
 * animation windows are display pacing, not the physical durations (those are quoted
 * per phase in `real` where the paper gives them).
 */

import { PAPER } from './paper.ts';

export const INSTRUMENTS = [
  'trapLaser',
  'slm',
  'aod',
  'motCoils',
  'motBeams',
  'molasses',
  'biasCoils',
  'microwave',
  'ramanLaser',
  'ramanGlobal',
  'ramanAod',
  'ryd420',
  'ryd1013',
  'lattice',
  'imaging',
  'shield',
  'objective',
  'camera',
  'computer',
  'awgRearr',
  'awgMove',
  'awgRydberg',
  'awgRaman',
  'awgRamanAod',
] as const;

export type Instrument = (typeof INSTRUMENTS)[number];

export type Window = readonly [number, number];

export type Event = { inst: Instrument; window: Window };

export type Phase = {
  id: string;
  label: string;
  /** What the paper says about this phase's timing or parameters. */
  real: string;
  window: Window;
};

/** Seconds for one full animated run. */
export const RUN_S = 64;

export const PHASES: readonly Phase[] = [
  {
    id: 'mot',
    label: 'Load: magneto-optical trap',
    real: `${PAPER.instruments.cell} · duration not quoted`,
    window: [0.0, 0.08],
  },
  {
    id: 'molasses',
    label: 'Cool into the tweezers',
    real: `${PAPER.instruments.molasses} → ${PAPER.loadingPct}% loading of the SLM array`,
    window: [0.08, 0.15],
  },
  {
    id: 'image0',
    label: 'First picture',
    real: 'global imaging light · objective → CMOS camera → desktop',
    window: [0.15, 0.21],
  },
  {
    id: 'rearrange',
    label: 'Rearrange to a defect-free array',
    real: 'Rearrangement AWG in FIFO mode, waveforms computed on the fly from the image',
    window: [0.21, 0.28],
  },
  {
    id: 'init',
    label: 'Initialize the qubits',
    real: `optical pumping into the m_F = 0 clock states · ${PAPER.cooling.bFieldG} G bias field on (the paper's operating field)`,
    window: [0.28, 0.33],
  },
  {
    id: 'moveIn',
    label: 'Move a block into the entangling zone',
    real: 'Moving AOD AWG · about one global Raman π pulse per move (dynamical decoupling)',
    window: [0.33, 0.41],
  },
  {
    id: 'local',
    label: 'Local single-qubit gates',
    real: `Raman AOD light grid · direct X(θ) rotations · ${PAPER.raman.localFidelityPct}% fidelity`,
    window: [0.41, 0.47],
  },
  {
    id: 'cz',
    label: 'Entangle: parallel CZ gates',
    real: `${PAPER.rydberg.blueNm} + ${PAPER.rydberg.irNm} nm to n = ${PAPER.rydberg.n} · ${PAPER.rydberg.gateNs} ns time-optimal pulse · ${PAPER.rydberg.czFidelityPct}% fidelity`,
    window: [0.47, 0.52],
  },
  {
    id: 'moveOut',
    label: 'Move the block to readout',
    real: 'Moving AOD AWG · global π pulse mid-move',
    window: [0.52, 0.6],
  },
  {
    id: 'lattice',
    label: 'Spin → position',
    real: `${PAPER.lattice.wavelengthNm} nm lattice ramped in ${PAPER.lattice.rampUs} μs · ${PAPER.lattice.pumpNm} nm pump · AODs split states by ${PAPER.lattice.splitUm} μm in ${PAPER.lattice.splitUs} μs`,
    window: [0.6, 0.67],
  },
  {
    id: 'image',
    label: 'Image the readout zone, shield storage',
    real: `1D PGC imaging in finite B · ${PAPER.shield.operateNm} nm shield on storage · bit-flip ${PAPER.lattice.bitFlipPct}%, loss ${PAPER.lattice.lossPct}%`,
    window: [0.67, 0.78],
  },
  {
    id: 'cool',
    label: 'Re-cool, refill, re-pump',
    real: `EIT cooling ~${PAPER.cooling.eitBlueMHz} MHz blue of F=2→F′=2 · refill from reservoir · re-initialize`,
    window: [0.78, 0.87],
  },
  {
    id: 'decode',
    label: 'Decode',
    real: 'camera frame → desktop; decoding and Pauli-frame feedforward are done in software after the run, not live',
    window: [0.87, 0.94],
  },
  {
    id: 'loop',
    label: 'Next layer',
    real: `Moving, Rydberg and Raman-AOD AWGs replay one memory segment per layer · ${PAPER.deep.layers} layers = ${PAPER.deep.circuitS} s`,
    window: [0.94, 1.0],
  },
];

/** Which instrument is active when (may overlap; several events per instrument). */
export const EVENTS: readonly Event[] = [
  // loading
  { inst: 'motCoils', window: [0.0, 0.1] },
  { inst: 'motBeams', window: [0.0, 0.085] },
  { inst: 'molasses', window: [0.08, 0.15] },
  { inst: 'trapLaser', window: [0.1, 1.0] },
  { inst: 'slm', window: [0.1, 1.0] },
  { inst: 'objective', window: [0.1, 1.0] },
  // first image and rearrangement
  { inst: 'imaging', window: [0.15, 0.2] },
  { inst: 'camera', window: [0.16, 0.21] },
  { inst: 'computer', window: [0.19, 0.24] },
  { inst: 'awgRearr', window: [0.22, 0.28] },
  { inst: 'aod', window: [0.22, 0.28] },
  // initialise
  { inst: 'biasCoils', window: [0.28, 1.0] },
  { inst: 'imaging', window: [0.29, 0.32] },
  // move in with a global π pulse
  { inst: 'awgMove', window: [0.33, 0.41] },
  { inst: 'aod', window: [0.33, 0.41] },
  { inst: 'awgRaman', window: [0.36, 0.385] },
  { inst: 'microwave', window: [0.36, 0.385] },
  { inst: 'ramanLaser', window: [0.36, 0.385] },
  { inst: 'ramanGlobal', window: [0.362, 0.383] },
  // local gates
  { inst: 'awgRaman', window: [0.41, 0.47] },
  { inst: 'awgRamanAod', window: [0.41, 0.47] },
  { inst: 'microwave', window: [0.41, 0.47] },
  { inst: 'ramanLaser', window: [0.41, 0.47] },
  { inst: 'ramanAod', window: [0.412, 0.468] },
  { inst: 'aod', window: [0.41, 0.47] },
  // CZ
  { inst: 'awgRydberg', window: [0.478, 0.512] },
  { inst: 'ryd420', window: [0.484, 0.506] },
  { inst: 'ryd1013', window: [0.484, 0.506] },
  { inst: 'aod', window: [0.47, 0.52] },
  // move out
  { inst: 'awgMove', window: [0.52, 0.6] },
  { inst: 'aod', window: [0.52, 0.6] },
  { inst: 'awgRaman', window: [0.55, 0.575] },
  { inst: 'microwave', window: [0.55, 0.575] },
  { inst: 'ramanLaser', window: [0.55, 0.575] },
  { inst: 'ramanGlobal', window: [0.552, 0.573] },
  // spin → position
  { inst: 'imaging', window: [0.6, 0.625] },
  { inst: 'lattice', window: [0.61, 0.67] },
  { inst: 'awgMove', window: [0.63, 0.67] },
  { inst: 'aod', window: [0.63, 0.78] },
  // image + shield
  { inst: 'imaging', window: [0.67, 0.78] },
  { inst: 'shield', window: [0.665, 0.785] },
  { inst: 'camera', window: [0.68, 0.79] },
  // cool, refill, re-pump
  { inst: 'imaging', window: [0.78, 0.87] },
  { inst: 'awgMove', window: [0.8, 0.86] },
  { inst: 'aod', window: [0.8, 0.86] },
  // decode
  { inst: 'computer', window: [0.86, 0.94] },
  // return the block to storage for the next layer
  { inst: 'awgMove', window: [0.94, 1.0] },
  { inst: 'aod', window: [0.94, 1.0] },
];

export function seg(u: number, w: Window): number {
  return Math.min(1, Math.max(0, (u - w[0]) / (w[1] - w[0])));
}

export function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}

/** Trapezoid envelope: quick rise and fall, on for most of the window. */
export function pulse(u: number, w: Window, edge = 0.12): number {
  if (u < w[0] || u > w[1]) return 0;
  const s = seg(u, w);
  if (s < edge) return smooth(s / edge);
  if (s > 1 - edge) return smooth((1 - s) / edge);
  return 1;
}

export type Activity = Record<Instrument, number>;

export function emptyActivity(): Activity {
  const a = {} as Activity;
  for (const k of INSTRUMENTS) a[k] = 0;
  return a;
}

/** Fill `out` with each instrument's 0..1 activity at run fraction `u`. */
export function evalActivity(u: number, out: Activity): Activity {
  for (const k of INSTRUMENTS) out[k] = 0;
  for (const e of EVENTS) {
    const span = e.window[1] - e.window[0];
    const p = pulse(u, e.window, Math.min(0.12, 0.006 / span));
    if (p > out[e.inst]) out[e.inst] = p;
  }
  return out;
}

export function phaseAt(u: number): Phase {
  return PHASES.find((p) => u >= p.window[0] && u < p.window[1]) ?? PHASES[PHASES.length - 1]!;
}
