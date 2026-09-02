import { useEffect, useMemo, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { erasureSpans, type Lattice, planarLattice } from '../../physics/qec.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, lcg, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';
import { layout } from './SurfaceCodeLab.tsx';

const W = 660;
const H = 400;
const D = 7;

export function ErasureBoard() {
  const [p, setP] = useState(0.3);
  const [seed, setSeed] = useState(1);
  const lat = useMemo(() => planarLattice(D), []);
  const geom = useMemo(() => layout(lat), [lat]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const erased = useMemo(() => {
    const rand = lcg(seed * 7919 + Math.round(p * 1000));
    const e = new Uint8Array(lat.n);
    for (let i = 0; i < lat.n; i += 1) if (rand() < p) e[i] = 1;
    return e;
  }, [lat, p, seed]);
  const spans = erasureSpans(lat, erased);
  const clusters = useMemo(() => components(lat, erased), [lat, erased]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, lat, geom, erased, clusters, spans, p);
  }, [lat, geom, erased, clusters, spans, p]);
  const nErased = erased.reduce((a, b) => a + b, 0);
  return (
    <Figure
      n="F29"
      title="Erasure: an error whose address you know"
      caption={
        <>
          The same d = {D} lattice, now with each qubit <em>lost</em> (white cross) with probability
          p — an atom that left its tweezer or leaked out of the qubit levels, detected by the
          camera. A lost qubit is replaced by a fresh one in a random state, so its error is as bad
          as any, but its <em>location is known</em>. The decoder then only has to work inside the
          erased set (coloured clusters): find any pattern of flips on erased qubits consistent
          with the syndrome. That fails only when a cluster of erasures connects the two rough
          boundaries (red), because then two consistent answers differ by a logical operator and
          the decoder must guess — right half the time. Whether such a spanning cluster exists is
          bond percolation on a square lattice, threshold p = ½: erasures can be tolerated at
          roughly five times the rate of unlocated errors. This is why the paper converts leakage
          into loss ({PAPER.qec.leakageIsLossPct}% of leakage detected as a missing atom) and feeds
          the loss image to the decoder, improving the logical error by {PAPER.qec.lossMlGain}×
          (chapter 11).
        </>
      }
    >
      <Panel tag="a" title={`p = ${p.toFixed(2)} · ${nErased} of ${lat.n} qubits erased · ${spans ? 'spanning cluster: decoder must guess' : 'no spanning cluster: decodable'}`} wide>
        <div className="mode-row">
          <button type="button" onClick={() => setSeed((s) => s + 1)}>
            resample
          </button>
        </div>
        <Slider label="Erasure probability p" value={p} min={0.05} max={0.8} step={0.01} display={p.toFixed(2)} onChange={setP} />
        <canvas ref={canvasRef} className="sketch" />
      </Panel>
    </Figure>
  );
}

/** Connected components of erased edges (via shared checks and the two boundary nodes). */
function components(lat: Lattice, erased: Uint8Array): { label: Int32Array; spanningLabel: number | null; count: number } {
  const L = lat.m;
  const R = lat.m + 1;
  const parent = Int32Array.from({ length: lat.m + 2 }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const ends = (e: number): [number, number] => {
    const g = lat.edges[e]!;
    if (g.kind === 'h') return [g.c === 0 ? L : lat.check(g.r, g.c - 1), g.c === lat.d - 1 ? R : lat.check(g.r, g.c)];
    return [lat.check(g.r, g.c), lat.check(g.r + 1, g.c)];
  };
  for (let e = 0; e < lat.n; e += 1) {
    if (erased[e] !== 1) continue;
    const [a, b] = ends(e);
    union(a, b);
  }
  const label = new Int32Array(lat.n).fill(-1);
  const ids = new Map<number, number>();
  for (let e = 0; e < lat.n; e += 1) {
    if (erased[e] !== 1) continue;
    const root = find(ends(e)[0]);
    if (!ids.has(root)) ids.set(root, ids.size);
    label[e] = ids.get(root)!;
  }
  const spanningLabel = find(L) === find(R) && ids.has(find(L)) ? ids.get(find(L))! : null;
  return { label, spanningLabel, count: ids.size };
}

const PALETTE = [BLUE, AMBER, GREEN, VIOLET, '#d47a6e', '#6ed4c8', '#c8c86e', '#9a8ad6'];

function draw(
  canvas: HTMLCanvasElement,
  lat: Lattice,
  geom: { edgePos: { x: number; y: number; kind: 'h' | 'v' }[]; checkPos: { x: number; y: number }[]; cell: number; ox: number; oy: number },
  erased: Uint8Array,
  clusters: ReturnType<typeof components>,
  spans: boolean,
  p: number,
): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const { cell, ox, oy } = geom;
  ctx.font = MONO;
  ctx.fillStyle = 'rgba(176,138,214,0.08)';
  ctx.fillRect(ox - cell * 0.5 - 6, oy - cell * 0.4, 8, (lat.d - 1) * cell + cell * 0.8);
  ctx.fillRect(ox + (lat.d - 1) * cell + cell * 0.5 - 2, oy - cell * 0.4, 8, (lat.d - 1) * cell + cell * 0.8);
  ctx.strokeStyle = '#26282c';
  for (let r = 0; r < lat.d; r += 1) {
    ctx.beginPath();
    ctx.moveTo(ox - cell * 0.5, oy + r * cell);
    ctx.lineTo(ox + (lat.d - 1) * cell + cell * 0.5, oy + r * cell);
    ctx.stroke();
  }
  for (let c = 0; c < lat.d - 1; c += 1) {
    ctx.beginPath();
    ctx.moveTo(ox + (c + 0.5) * cell, oy);
    ctx.lineTo(ox + (c + 0.5) * cell, oy + (lat.d - 1) * cell);
    ctx.stroke();
  }
  // erased edges as thick coloured segments
  for (let e = 0; e < lat.n; e += 1) {
    if (erased[e] !== 1) continue;
    const q = geom.edgePos[e]!;
    const lab = clusters.label[e]!;
    const col = clusters.spanningLabel === lab ? RED : PALETTE[lab % PALETTE.length]!;
    ctx.strokeStyle = col;
    ctx.lineWidth = clusters.spanningLabel === lab ? 5 : 3;
    ctx.beginPath();
    if (q.kind === 'h') {
      ctx.moveTo(q.x - cell * 0.5, q.y);
      ctx.lineTo(q.x + cell * 0.5, q.y);
    } else {
      ctx.moveTo(q.x, q.y - cell * 0.5);
      ctx.lineTo(q.x, q.y + cell * 0.5);
    }
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  // qubits
  for (let e = 0; e < lat.n; e += 1) {
    const q = geom.edgePos[e]!;
    if (erased[e] === 1) {
      ctx.strokeStyle = CREAM;
      ctx.beginPath();
      ctx.moveTo(q.x - 4, q.y - 4);
      ctx.lineTo(q.x + 4, q.y + 4);
      ctx.moveTo(q.x + 4, q.y - 4);
      ctx.lineTo(q.x - 4, q.y + 4);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(q.x, q.y, cell * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#2a2c30';
      ctx.fill();
    }
  }
  // checks
  for (let k = 0; k < lat.m; k += 1) {
    const q = geom.checkPos[k]!;
    const s = cell * 0.2;
    ctx.fillStyle = '#151618';
    ctx.strokeStyle = '#34363a';
    ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    ctx.strokeRect(q.x - s / 2, q.y - s / 2, s, s);
  }
  // side panel
  const lx = 428;
  frame(ctx, lx, 40, 216, 320, 'erasure decoding');
  ctx.fillStyle = MUTED;
  const lines = [
    `erased: ${erased.reduce((a, b) => a + b, 0)} / ${lat.n}`,
    `clusters: ${clusters.count}`,
    '',
    'rule: a cluster touching both',
    'rough boundaries hides a',
    'logical operator inside the',
    'unknown region → 50% guess.',
    '',
    'otherwise every consistent',
    'correction is equivalent →',
    'decoding always succeeds.',
    '',
    `p = ${p.toFixed(2)} vs p_c = 0.50`,
  ];
  lines.forEach((t, i) => ctx.fillText(t, lx + 10, 66 + i * 16));
  ctx.fillStyle = spans ? RED : GREEN;
  ctx.fillText(spans ? 'spanning cluster present' : 'no spanning cluster', lx + 10, 66 + 14 * 16);
  ctx.fillStyle = CREAM;
  ctx.fillText(spans ? 'P(logical error) = 1/2' : 'P(logical error) = 0', lx + 10, 66 + 15 * 16);
}
