import { useMemo, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { ERASURE_THRESHOLD, type Lattice, PAULI_THRESHOLD, planarLattice, trialErasure, trialPauli } from '../../physics/qec.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, lcg, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 360;
const DS = [3, 5, 7] as const;
const N_P = 16;
type Model = 'pauli' | 'erasure';

const P_GRID: Record<Model, number[]> = {
  pauli: Array.from({ length: N_P }, (_, i) => 0.01 * (30 / 1) ** (i / (N_P - 1))), // 0.01 → 0.30
  erasure: Array.from({ length: N_P }, (_, i) => 0.05 * (0.8 / 0.05) ** (i / (N_P - 1))), // 0.05 → 0.80
};

type Tally = { trials: Uint32Array; fails: Uint32Array };

export function ThresholdPlot() {
  const [model, setModel] = useState<Model>('pauli');
  const [pRead, setPRead] = useState(0.03);
  const lats = useMemo(() => DS.map((d) => planarLattice(d)), []);
  const tallies = useRef<Record<Model, Tally[]>>({ pauli: fresh(), erasure: fresh() });
  const rand = useRef(lcg(77));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useRaf(
    () => {
      // ~6 ms of Monte Carlo per frame, round-robin over d and p
      const t0 = performance.now();
      const grid = P_GRID[model];
      const tl = tallies.current[model];
      let guard = 0;
      while (performance.now() - t0 < 6 && guard < 4000) {
        guard += 1;
        const di = guard % DS.length;
        const pi = (guard * 7) % N_P;
        const lat = lats[di]!;
        const p = grid[pi]!;
        const t = tl[di]!;
        // spend fewer trials where the estimate is already tight
        if ((t.trials[pi] ?? 0) > 20000) continue;
        const fail = model === 'pauli' ? trialPauli(lat, p, rand.current) : trialErasure(lat, p, rand.current);
        t.trials[pi] = (t.trials[pi] ?? 0) + 1;
        if (fail) t.fails[pi] = (t.fails[pi] ?? 0) + 1;
      }
      const canvas = canvasRef.current;
      if (canvas !== null) draw(canvas, model, tl, pRead, lats);
    },
    true,
    wrapRef,
  );

  const pth = model === 'pauli' ? PAULI_THRESHOLD : ERASURE_THRESHOLD;
  return (
    <Figure
      n="F28"
      title="The threshold: below it, bigger codes are better"
      caption={
        <>
          Monte Carlo logical error rate of the planar code (one error sector, perfect syndrome
          measurement, matching decoder) accumulating live for d = 3, 5, 7. <strong>Pauli
          errors:</strong> the curves cross near p<sub>th</sub> ≈ {(PAULI_THRESHOLD * 100).toFixed(0)}% — below it
          each step d → d+2 divides the logical error by Λ ≈ p<sub>th</sub>/p; above it, more qubits
          only mean more places to fail. <strong>Erasures:</strong> when the machine knows{' '}
          <em>which</em> qubits were lost, decoding is a percolation problem and the threshold
          jumps to {ERASURE_THRESHOLD * 100}%. The paper&rsquo;s Λ = {PAPER.qec.belowThreshold}(
          {PAPER.qec.belowThresholdUnc}) between d = 3 and d = 5 (chapter 11) is the same ratio
          read off a real machine with noisy syndrome extraction over several rounds — a harder
          decoding problem than this idealised single-round model, so the two Λ values are not
          directly comparable. The paper converts{' '}
          {PAPER.qec.leakageIsLossPct}% of leakage into detected loss and gains{' '}
          {PAPER.qec.lossMlGain}× from telling the decoder about it: a partial move from the left
          curve family to the right one.
        </>
      }
    >
      <Panel tag="a" title={`${model === 'pauli' ? 'Pauli (unknown location)' : 'erasure (known location)'} · p_th ≈ ${(pth * 100).toFixed(0)}%`} wide>
        <div ref={wrapRef}>
          <div className="mode-row">
            <button type="button" className={model === 'pauli' ? 'active' : undefined} onClick={() => { setModel('pauli'); setPRead(0.03); }}>
              Pauli errors
            </button>
            <button type="button" className={model === 'erasure' ? 'active' : undefined} onClick={() => { setModel('erasure'); setPRead(0.3); }}>
              erasures
            </button>
            <button
              type="button"
              onClick={() => {
                tallies.current = { pauli: fresh(), erasure: fresh() };
              }}
            >
              restart sampling
            </button>
          </div>
          <Slider
            label="Read Λ at physical error rate p"
            value={pRead}
            min={model === 'pauli' ? 0.01 : 0.05}
            max={model === 'pauli' ? 0.3 : 0.8}
            step={0.005}
            display={pRead.toFixed(3)}
            onChange={setPRead}
          />
          <canvas ref={canvasRef} className="sketch" />
        </div>
      </Panel>
    </Figure>
  );
}

function fresh(): Tally[] {
  return DS.map(() => ({ trials: new Uint32Array(N_P), fails: new Uint32Array(N_P) }));
}

function interp(grid: number[], t: Tally, p: number): number | null {
  // log-linear interpolation of the estimated rate at p
  let i = 0;
  while (i < grid.length - 2 && grid[i + 1]! < p) i += 1;
  const p0 = grid[i]!;
  const p1 = grid[i + 1]!;
  const r0 = (t.trials[i] ?? 0) > 20 ? (t.fails[i] ?? 0) / (t.trials[i] ?? 1) : null;
  const r1 = (t.trials[i + 1] ?? 0) > 20 ? (t.fails[i + 1] ?? 0) / (t.trials[i + 1] ?? 1) : null;
  if (r0 === null || r1 === null) return null;
  const f = (Math.log(p) - Math.log(p0)) / (Math.log(p1) - Math.log(p0));
  const lo = Math.max(r0, 1e-4);
  const hi = Math.max(r1, 1e-4);
  return Math.exp(Math.log(lo) + f * (Math.log(hi) - Math.log(lo)));
}

function draw(canvas: HTMLCanvasElement, model: Model, tl: Tally[], pRead: number, lats: Lattice[]): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const grid = P_GRID[model];
  const px = 60;
  const py = 20;
  const pw = 400;
  const ph = 300;
  frame(ctx, px, py, pw, ph, 'logical error P_L vs physical error p  (log–log)');
  const pMin = grid[0]!;
  const pMax = grid[N_P - 1]!;
  const lMin = 1e-4;
  const xOf = (p: number) => px + 10 + ((Math.log(p) - Math.log(pMin)) / (Math.log(pMax) - Math.log(pMin))) * (pw - 20);
  const yOf = (l: number) => py + ph - 30 - ((Math.log(Math.max(l, lMin)) - Math.log(lMin)) / (Math.log(1) - Math.log(lMin))) * (ph - 50);
  ctx.font = MONO;
  // gridlines
  for (const l of [1e-3, 1e-2, 1e-1, 1]) {
    ctx.strokeStyle = '#1d1e20';
    ctx.beginPath();
    ctx.moveTo(px + 10, yOf(l));
    ctx.lineTo(px + pw - 10, yOf(l));
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.fillText(l === 1 ? '1' : l.toExponential(0), px - 34, yOf(l) + 4);
  }
  for (const p of model === 'pauli' ? [0.01, 0.03, 0.1, 0.3] : [0.05, 0.1, 0.2, 0.5]) {
    ctx.fillStyle = MUTED;
    ctx.fillText(`${(p * 100).toFixed(0)}%`, xOf(p) - 8, py + ph - 10);
  }
  // P_L = p diagonal
  ctx.strokeStyle = '#2a2c30';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(xOf(pMin), yOf(pMin));
  ctx.lineTo(xOf(pMax), yOf(pMax));
  ctx.stroke();
  // threshold
  const pth = model === 'pauli' ? PAULI_THRESHOLD : ERASURE_THRESHOLD;
  ctx.strokeStyle = 'rgba(200,30,30,0.5)';
  ctx.beginPath();
  ctx.moveTo(xOf(pth), py + 24);
  ctx.lineTo(xOf(pth), py + ph - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = RED;
  ctx.fillText(`p_th ≈ ${(pth * 100).toFixed(0)}%`, xOf(pth) + 4, py + 34);
  ctx.fillStyle = MUTED;
  ctx.fillText('P_L = p', xOf(pMin) + 4, yOf(pMin) - 10);
  // readout line
  ctx.strokeStyle = 'rgba(232,228,220,0.35)';
  ctx.beginPath();
  ctx.moveTo(xOf(pRead), py + 24);
  ctx.lineTo(xOf(pRead), py + ph - 30);
  ctx.stroke();
  // curves
  const cols = [BLUE, AMBER, GREEN];
  let total = 0;
  DS.forEach((d, di) => {
    const t = tl[di]!;
    ctx.strokeStyle = cols[di]!;
    ctx.fillStyle = cols[di]!;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < N_P; i += 1) {
      const n = t.trials[i] ?? 0;
      total += n;
      if (n < 20) continue;
      const r = (t.fails[i] ?? 0) / n;
      const x = xOf(grid[i]!);
      const y = yOf(r);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < N_P; i += 1) {
      const n = t.trials[i] ?? 0;
      if (n < 20) continue;
      const r = (t.fails[i] ?? 0) / n;
      // binomial error bar
      const se = Math.sqrt(Math.max(r * (1 - r), 1 / n) / n);
      ctx.beginPath();
      ctx.arc(xOf(grid[i]!), yOf(r), 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(xOf(grid[i]!), yOf(r + se));
      ctx.lineTo(xOf(grid[i]!), yOf(Math.max(r - se, lMin)));
      ctx.stroke();
    }
    ctx.fillText(`d = ${d}`, px + pw - 60, py + ph - 88 + di * 14);
  });

  // --- readout panel
  const rx = 480;
  frame(ctx, rx, py, 160, ph, 'read-out');
  ctx.fillStyle = CREAM;
  ctx.fillText(`p = ${(pRead * 100).toFixed(1)}%`, rx + 10, py + 40);
  const [e3, e5, e7] = DS.map((_, di) => interp(grid, tl[di]!, pRead)) as [number | null, number | null, number | null];
  [e3, e5, e7].forEach((v, di) => {
    ctx.fillStyle = cols[di]!;
    ctx.fillText(`P_L(d=${DS[di]}) = ${v === null ? '…' : v.toExponential(2)}`, rx + 10, py + 66 + di * 18);
  });
  const l35 = e3 !== null && e5 !== null && e5 > 0 ? e3 / e5 : null;
  const l57 = e5 !== null && e7 !== null && e7 > 0 ? e5 / e7 : null;
  ctx.fillStyle = CREAM;
  ctx.fillText(`Λ(3→5) = ${l35 === null ? '…' : l35.toFixed(2)}`, rx + 10, py + 134);
  ctx.fillText(`Λ(5→7) = ${l57 === null ? '…' : l57.toFixed(2)}`, rx + 10, py + 152);
  ctx.fillStyle = MUTED;
  ctx.fillText(pRead < pth ? 'Λ > 1: below threshold' : 'Λ < 1: above threshold', rx + 10, py + 176);
  ctx.fillStyle = VIOLET;
  ctx.fillText(`paper: Λ = ${PAPER.qec.belowThreshold}`, rx + 10, py + 206);
  ctx.fillStyle = MUTED;
  ctx.fillText('(d=3 → d=5, real machine)', rx + 10, py + 220);
  ctx.fillText(`${lats.map((l) => l.n).join(' / ')} qubits`, rx + 10, py + 250);
  ctx.fillText(`${total.toLocaleString()} trials so far`, rx + 10, py + 266);
}
