/**
 * Writes docs/CLAIMS.md: every constant the explainer displays, its value, and where in
 * the paper it comes from. Run with `npm run ledger` (Node ≥ 22.6 strips the types).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAPER } from '../src/data/paper.ts';
import { PROVENANCE, STANDARD_VALUES } from '../src/data/provenance.ts';

function resolve(path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], PAPER);
}

const fmt = (v: unknown): string => {
  if (Array.isArray(v)) return v.join(' × ');
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toString();
  return String(v);
};

const esc = (s: string) => s.replace(/\|/g, '\\|');

const paperRows = PROVENANCE.filter((p) => p.kind === 'paper').map(
  (p) => `| \`${p.path}\` | ${esc(fmt(resolve(p.path)))} | ${esc(p.where)} | “${esc(p.quote)}”${p.note ? ` — ${esc(p.note)}` : ''} |`,
);
const assumedRows = PROVENANCE.filter((p) => p.kind === 'assumed').map(
  (p) => `| \`${p.path}\` | ${esc(fmt(resolve(p.path)))} | ${esc(p.where)} | ${esc(p.note ?? '')} |`,
);
const standardRows = STANDARD_VALUES.map((p) => `| ${esc(p.path)} | ${esc(p.note ?? '')} | ${esc(p.where)} |`);

const md = `# Claims ledger

Every constant shown on the explainer, with the place in Bluvstein, Geim et al.,
*Nature* **649**, 39–46 (2026), doi:10.1038/s41586-025-09848-5, that states it.
Generated from \`src/data/provenance.ts\` by \`npm run ledger\`; the test suite checks that
each quoted fragment appears verbatim in the paper text when \`PAPER_TXT\` is set.

## Stated in the paper (${paperRows.length})

| Key | Value | Where | Quoted fragment |
| --- | --- | --- | --- |
${paperRows.join('\n')}

## Assumed by this site, not stated in the paper (${assumedRows.length})

| Key | Value | Source | Note |
| --- | --- | --- | --- |
${assumedRows.join('\n')}

## Standard atomic data used alongside the paper (${standardRows.length})

| Quantity | Value | Source |
| --- | --- | --- |
${standardRows.join('\n')}

## Derived on the page

These are computed live from the constants above and labelled as such where shown:

- Rayleigh limit 0.61 λ/NA = 0.73 μm (780 nm, NA 0.65) — chapter 09.
- Collection fraction (1 − cos θ)/2 = 12.0 % for NA 0.65 — chapter 09, Fig. 1.
- Blockade radius R_b = (C₆/ħΩ)^{1/6} ≈ 4.4 μm for n = 53, Ω = 2π × 4.6 MHz, using the
  n*¹¹-scaled C₆ estimate above (not a paper number) — Fig. 1.
- Rayleigh range z_R = π w₀²/λ = 3.7 μm for an assumed 1 μm tweezer waist — Fig. 1.
- Mean orbital radii from the Rb quantum defects — chapter 02.
- Two-atom blockade populations from the Schrödinger equation — Fig. 5.
`;

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'CLAIMS.md');
writeFileSync(out, md);
console.log(`wrote ${out}: ${paperRows.length} paper, ${assumedRows.length} assumed, ${standardRows.length} standard`);
