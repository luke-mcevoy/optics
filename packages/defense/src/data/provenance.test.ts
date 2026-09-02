import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAPER } from './paper.ts';
import { PROVENANCE } from './provenance.ts';

function resolve(path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], PAPER);
}

/** Every leaf of PAPER as a dotted path. */
function leaves(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  if (Array.isArray(obj)) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix === '' ? k : `${prefix}.${k}`));
}

const normalise = (s: string) => s.replace(/\s+/g, ' ').replace(/[‐‑‒–—−]/g, '-').toLowerCase();

describe('claims ledger', () => {
  it('every provenance path points at a real PAPER value', () => {
    for (const p of PROVENANCE) {
      expect(resolve(p.path), p.path).not.toBeUndefined();
    }
  });

  it('every PAPER leaf has a provenance entry (or is a pure string label)', () => {
    const covered = new Set(PROVENANCE.map((p) => p.path));
    const exempt = new Set([
      'cite',
      'doi',
      'species',
      'qubit.encoding',
      'aod.wavelengthNm', // same laser as slm.wavelengthNm
      'shield.waistUm', // string form of beams.shieldWaistUm
      'instruments.cell',
      'instruments.slm', // duplicates slm.model
      'instruments.aod', // duplicates aod.model
      'instruments.camera', // duplicates imaging.camera
      'instruments.awg', // duplicates control.awgs / control.vendor
      'instruments.ramanLocal',
      'lattice.bitFlipUnc',
      'lattice.lossUnc',
      'qec.belowThresholdUnc',
      'qec.d5LeprUnc',
    ]);
    const missing = leaves(PAPER).filter((k) => !covered.has(k) && !exempt.has(k));
    expect(missing).toEqual([]);
  });

  it('paper-stated entries carry a non-empty quote and a section', () => {
    for (const p of PROVENANCE) {
      if (p.kind === 'paper') {
        expect(p.quote.length, p.path).toBeGreaterThan(0);
        expect(p.where.length, p.path).toBeGreaterThan(0);
      }
    }
  });

  const txt = process.env.PAPER_TXT;
  const available = txt !== undefined && existsSync(txt);
  it.skipIf(!available)('every quote appears verbatim in the paper text (PAPER_TXT)', () => {
    const paper = normalise(readFileSync(txt!, 'utf8'));
    const missing = PROVENANCE.filter((p) => p.kind === 'paper' && !paper.includes(normalise(p.quote)));
    expect(missing.map((p) => `${p.path}: “${p.quote}”`)).toEqual([]);
  });
});
