import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { decodeMatching, isLogicalError, type Lattice, planarLattice, syndrome, xor } from '../../physics/qec.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, lcg, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 400;
const DS = [3, 5, 7] as const;

type Phase = 'errors' | 'syndrome' | 'decoded';

export function SurfaceCodeLab() {
  const [d, setD] = useState<number>(5);
  const [p, setP] = useState(0.08);
  const [phase, setPhase] = useState<Phase>('errors');
  const lat = useMemo(() => planarLattice(d), [d]);
  const rand = useRef(lcg(41));
  const [errors, setErrors] = useState<Uint8Array>(() => sampleAt(planarLattice(5), 0.08, rand.current));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setErrors(sampleAt(lat, 0.08, rand.current));
    setPhase('errors');
  }, [lat]);

  const synd = useMemo(() => syndrome(lat, errors), [lat, errors]);
  const decoded = useMemo(() => decodeMatching(lat, synd), [lat, synd]);
  const residual = useMemo(() => xor(errors, decoded.correction), [errors, decoded]);
  const failed = isLogicalError(lat, residual);
  const geom = useMemo(() => layout(lat), [lat]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, lat, geom, errors, synd, decoded, residual, phase, failed);
  }, [lat, geom, errors, synd, decoded, residual, phase, failed]);

  const sample = () => {
    setErrors(sampleAt(lat, p, rand.current));
    setPhase('errors');
  };
  const onClick = (ev: MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * W;
    const y = ((ev.clientY - rect.top) / rect.height) * H;
    let best = -1;
    let bd = 14;
    geom.edgePos.forEach((q, i) => {
      const dd = Math.hypot(q.x - x, q.y - y);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    if (best < 0) return;
    const e = new Uint8Array(errors);
    e[best] = (e[best] ?? 0) ^ 1;
    setErrors(e);
    setPhase('errors');
  };

  const nErr = errors.reduce((a, b) => a + b, 0);
  const nDef = synd.reduce((a, b) => a + b, 0);
  return (
    <Figure
      n="F27"
      title="A surface code, decoded by hand"
      caption={
        <>
          A distance-d planar code, one error type shown (X flips on the data qubits, dots on
          the edges; the Z-type sector is the mirror image). Squares are parity checks, each
          touching its four (or three) neighbouring qubits; a check lights up when an odd number
          of them flipped. Click qubits to place errors, or sample them at rate p. The syndrome
          shows only the <em>endpoints</em> of error chains — a chain of two adjacent errors lights
          two checks, not three — so the decoder&rsquo;s job is to pair up lit checks (or send them
          to the left/right boundary) along the shortest total path, and flip everything on those
          paths. Success means error ⊕ correction is a closed loop or a boundary-to-boundary
          chain of <em>even</em> parity; failure is a chain of odd parity crossing left to right —
          a logical X. Exact minimum-weight matching for ≤14 lit checks, greedy beyond. The
          paper&rsquo;s d = 3 and d = 5 codes (Fig. 2) are the rotated variant of this lattice —
          d² data qubits on a tilted checkerboard — with the same distance and decoding problem.
        </>
      }
    >
      <Panel
        tag="a"
        title={`d = ${d} · ${lat.n} data qubits · ${nErr} errors · ${nDef} lit checks · ${phase === 'decoded' ? (failed ? 'LOGICAL ERROR' : 'corrected') : phase}`}
        wide
      >
        <div className="mode-row">
          {DS.map((k) => (
            <button key={k} type="button" className={d === k ? 'active' : undefined} onClick={() => setD(k)}>
              d = {k}
            </button>
          ))}
          <button type="button" onClick={sample}>
            sample errors
          </button>
          <button type="button" className={phase === 'syndrome' ? 'active' : undefined} onClick={() => setPhase('syndrome')}>
            show syndrome only
          </button>
          <button type="button" className={phase === 'decoded' ? 'active' : undefined} onClick={() => setPhase('decoded')}>
            decode
          </button>
          <button
            type="button"
            onClick={() => {
              setErrors(new Uint8Array(lat.n));
              setPhase('errors');
            }}
          >
            clear
          </button>
        </div>
        <Slider label="Error rate p for sampling" value={p} min={0.01} max={0.3} step={0.01} display={p.toFixed(2)} onChange={setP} />
        <canvas ref={canvasRef} className="sketch" onClick={onClick} style={{ cursor: 'crosshair' }} />
      </Panel>
    </Figure>
  );
}

function sampleAt(lat: Lattice, p: number, rand: () => number): Uint8Array {
  const e = new Uint8Array(lat.n);
  for (let i = 0; i < lat.n; i += 1) if (rand() < p) e[i] = 1;
  return e;
}

export type Geom = { edgePos: { x: number; y: number; kind: 'h' | 'v' }[]; checkPos: { x: number; y: number }[]; cell: number; ox: number; oy: number };

export function layout(lat: Lattice): Geom {
  const cell = Math.min(60, 300 / lat.d);
  const gridW = lat.d * cell;
  const gridH = (lat.d - 1) * cell;
  const ox = 40 + (360 - gridW) / 2;
  const oy = 40 + (320 - gridH) / 2;
  const edgePos = lat.edges.map((g) =>
    g.kind === 'h'
      ? { x: ox + g.c * cell, y: oy + g.r * cell, kind: 'h' as const }
      : { x: ox + (g.c + 0.5) * cell, y: oy + (g.r + 0.5) * cell, kind: 'v' as const },
  );
  const checkPos: { x: number; y: number }[] = [];
  for (let r = 0; r < lat.d; r += 1) for (let c = 0; c < lat.d - 1; c += 1) checkPos[lat.check(r, c)] = { x: ox + (c + 0.5) * cell, y: oy + r * cell };
  return { edgePos, checkPos, cell, ox, oy };
}

function draw(
  canvas: HTMLCanvasElement,
  lat: Lattice,
  geom: Geom,
  errors: Uint8Array,
  synd: Uint8Array,
  decoded: ReturnType<typeof decodeMatching>,
  residual: Uint8Array,
  phase: Phase,
  failed: boolean,
): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const { cell, ox, oy } = geom;
  ctx.font = MONO;
  // boundaries
  ctx.fillStyle = 'rgba(176,138,214,0.08)';
  ctx.fillRect(ox - cell * 0.5 - 6, oy - cell * 0.4, 8, (lat.d - 1) * cell + cell * 0.8);
  ctx.fillRect(ox + (lat.d - 1) * cell + cell * 0.5 - 2, oy - cell * 0.4, 8, (lat.d - 1) * cell + cell * 0.8);
  ctx.fillStyle = MUTED;
  ctx.fillText('rough', ox - cell * 0.5 - 40, oy + ((lat.d - 1) * cell) / 2);
  ctx.fillText('rough', ox + (lat.d - 1) * cell + cell * 0.5 + 12, oy + ((lat.d - 1) * cell) / 2);
  // lattice lines (edges)
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
  // correction paths
  if (phase === 'decoded') {
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 3;
    for (let e = 0; e < lat.n; e += 1) {
      if (decoded.correction[e] !== 1) continue;
      const q = geom.edgePos[e]!;
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
  }
  // data qubits
  for (let e = 0; e < lat.n; e += 1) {
    const q = geom.edgePos[e]!;
    const err = errors[e] === 1;
    const show = phase !== 'syndrome';
    const res = phase === 'decoded' && residual[e] === 1;
    ctx.beginPath();
    ctx.arc(q.x, q.y, cell * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = show && err ? RED : '#2a2c30';
    ctx.fill();
    if (res) {
      ctx.strokeStyle = failed ? RED : AMBER;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  // checks
  for (let r = 0; r < lat.d; r += 1) {
    for (let c = 0; c < lat.d - 1; c += 1) {
      const k = lat.check(r, c);
      const q = geom.checkPos[k]!;
      const lit = synd[k] === 1;
      const s = cell * 0.22;
      ctx.fillStyle = lit ? VIOLET : '#151618';
      ctx.strokeStyle = lit ? VIOLET : '#34363a';
      ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
      ctx.strokeRect(q.x - s / 2, q.y - s / 2, s, s);
    }
  }
  // matching lines
  if (phase === 'decoded') {
    ctx.strokeStyle = 'rgba(127,191,127,0.6)';
    ctx.setLineDash([3, 3]);
    for (const [a, b] of decoded.pairs) {
      const pa = geom.checkPos[lat.check(a.r, a.c)]!;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      if (b === null) {
        const left = a.c + 1 <= lat.d - 1 - a.c;
        ctx.lineTo(left ? ox - cell * 0.5 : ox + (lat.d - 1) * cell + cell * 0.5, pa.y);
      } else {
        const pb = geom.checkPos[lat.check(b.r, b.c)]!;
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  // legend
  const lx = 428;
  frame(ctx, lx, 40, 216, 320, 'legend');
  const line = (y: number, col: string, txt: string, kind: 'dot' | 'sq' | 'bar' | 'ring') => {
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    if (kind === 'dot') {
      ctx.beginPath();
      ctx.arc(lx + 18, y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'sq') ctx.fillRect(lx + 13, y - 5, 10, 10);
    else if (kind === 'bar') {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx + 10, y);
      ctx.lineTo(lx + 26, y);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx + 18, y, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = MUTED;
    ctx.fillText(txt, lx + 34, y + 4);
  };
  line(70, '#2a2c30', 'data qubit', 'dot');
  line(92, RED, 'X error', 'dot');
  line(114, '#151618', 'parity check (Z Z Z Z)', 'sq');
  line(136, VIOLET, 'lit: odd errors around it', 'sq');
  line(158, GREEN, 'decoder correction', 'bar');
  line(180, AMBER, 'residual (harmless loop)', 'ring');
  line(202, RED, 'residual crossing = X_L', 'ring');
  ctx.fillStyle = CREAM;
  const status =
    phase === 'errors'
      ? ['1. place or sample errors', '2. "show syndrome only" is what', '   the machine actually sees', '3. "decode" to run matching']
      : phase === 'syndrome'
        ? ['Only the squares are observable.', 'Which error pattern made them?', 'Many could have — the decoder', 'picks the most likely (shortest).']
        : failed
          ? ['Residual has odd weight on the', 'left boundary: a logical X.', 'The decoder chose a chain that,', 'with the errors, spans the code.']
          : ['Residual is trivial: every check', 'is dark and no chain spans the', 'lattice. The encoded qubit is', 'exactly as it was.'];
  status.forEach((t, i) => ctx.fillText(t, lx + 10, 250 + i * 16));
  if (phase === 'decoded') {
    ctx.fillStyle = MUTED;
    ctx.fillText(decoded.exact ? 'matching: exact MWPM' : 'matching: greedy (>14 defects)', lx + 10, 330);
  }
  ctx.fillStyle = BLUE;
  ctx.fillText('d = ' + lat.d, ox, oy + (lat.d - 1) * cell + cell * 0.5 + 24);
}
