import { useMemo, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import {
  clockSensitivityHzPerG,
  dephasingTimeS,
  gaussianContrast,
  linearZeemanHzPerG,
} from '../../physics/hyperfine.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';

const W = 660;
const H = 330;
const N = 40;
/** Wall-clock seconds for one sweep of the time window. */
const SWEEP_S = 8;

const MONO = '11px IBM Plex Mono, monospace';
const SANS = '12px Source Sans 3, sans-serif';
const BLUE = '#6ea8d4';
const CREAM = '#e8e4dc';
const MUTED = '#8b8680';
const VIOLET = '#b08ad6';

/** Fixed Gaussian draws so the ensemble is the same on every restart (Box–Muller, LCG). */
function gaussianDraws(n: number, seed: number): Float64Array {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const u = Math.max(rand(), Number.EPSILON);
    const v = rand();
    out[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  return out;
}

export function Dephasing() {
  const [sigmaMg, setSigmaMg] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const draws = useMemo(() => gaussianDraws(N, 11), []);

  const b = PAPER.cooling.bFieldG;
  const sigmaG = sigmaMg * 1e-3;
  const sigLin = linearZeemanHzPerG(2, 1) * sigmaG;
  const sigClock = clockSensitivityHzPerG(b) * sigmaG;
  const tLin = dephasingTimeS(sigLin);
  const tClock = dephasingTimeS(sigClock);
  const tWindow = 3 * tClock;

  useRaf((nowMs) => {
    const last = lastRef.current;
    lastRef.current = nowMs;
    if (last !== null) {
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      tRef.current = (tRef.current + (dt / SWEEP_S) * tWindow) % tWindow;
    }
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, tRef.current, tWindow, draws, sigLin, sigClock);
  }, true, canvasRef);

  return (
    <Figure
      n="F4"
      title="Why the clock pair keeps its phase"
      caption={
        <>
          A Ramsey picture: {N} atoms are put in an equal superposition at t = 0 and each
          accumulates phase at its own transition frequency. The field differs from atom to
          atom (or shot to shot) by a Gaussian spread σ<sub>B</sub>, so the frequencies are
          spread by σ<sub>ν</sub> = (dν/dB) σ<sub>B</sub>. Left: the phases as arrows.
          Right: the ensemble contrast |⟨e<sup>iφ</sup>⟩|, with the analytic
          exp(−(2πσ<sub>ν</sub>t)²/2) dashed; its 1/e time is T<sub>2</sub>* =
          1/(√2 π σ<sub>ν</sub>). Top row: a qubit on |2,0⟩ ↔ |2,+1⟩, slope{' '}
          {(linearZeemanHzPerG(2, 1) / 1e3).toFixed(0)} kHz/G. Bottom row: the clock pair at
          the paper&rsquo;s {b} G, slope {(clockSensitivityHzPerG(b) / 1e3).toFixed(1)} kHz/G.
          Same atoms, same noise, {Math.round(tClock / tLin)}× longer memory. The sampled curve
          settles at the finite-ensemble floor ≈ 1/√{N} = {Math.round(100 / Math.sqrt(N))}% rather
          than zero. This shows only
          quasi-static field noise; the paper&rsquo;s measured T<sub>2</sub> of 1–2 s also
          relies on dynamical decoupling, which cancels slow shifts like these outright.
        </>
      }
    >
      <Panel tag="a" title={`Field noise σ_B, at B = ${b} G`} wide>
        <Slider
          label="Field noise σ_B (rms)"
          value={sigmaMg}
          min={0.1}
          max={10}
          step={0.1}
          unit="mG"
          display={sigmaMg.toFixed(1)}
          onChange={(v) => {
            setSigmaMg(v);
            tRef.current = 0;
          }}
        />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          σ<sub>ν</sub>: linear pair {sigLin.toFixed(0)} Hz → T<sub>2</sub>* = {(tLin * 1e3).toFixed(2)} ms
          &nbsp;·&nbsp; clock pair {sigClock.toFixed(1)} Hz → T<sub>2</sub>* = {(tClock * 1e3).toFixed(1)} ms
        </p>
      </Panel>
    </Figure>
  );
}

function draw(
  canvas: HTMLCanvasElement,
  t: number,
  tWindow: number,
  draws: Float64Array,
  sigLin: number,
  sigClock: number,
): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const rows: readonly { y: number; sigma: number; label: string; color: string }[] = [
    { y: 85, sigma: sigLin, label: '|2,0⟩ ↔ |2,+1⟩   (linear Zeeman)', color: BLUE },
    { y: 245, sigma: sigClock, label: '|1,0⟩ ↔ |2,0⟩   (clock pair)', color: VIOLET },
  ];
  const cx = 90;
  const R = 58;
  const px = 200;
  const pw = W - px - 30;
  const ph = 110;

  for (const row of rows) {
    // phasors
    ctx.strokeStyle = '#26282c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, row.y, R, 0, 2 * Math.PI);
    ctx.stroke();
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < draws.length; i += 1) {
      const phi = 2 * Math.PI * row.sigma * (draws[i] ?? 0) * t;
      const x = cx + R * Math.cos(phi);
      const y = row.y - R * Math.sin(phi);
      sx += Math.cos(phi);
      sy += Math.sin(phi);
      ctx.strokeStyle = row.color;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(cx, row.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const c = Math.hypot(sx, sy) / draws.length;
    const mx = cx + R * (sx / draws.length);
    const my = row.y - R * (sy / draws.length);
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, row.y);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(mx, my, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = row.color;
    ctx.font = SANS;
    ctx.fillText(row.label, px, row.y - ph / 2 - 8);

    // contrast plot
    const py = row.y - ph / 2;
    const xOf = (tt: number) => px + (tt / tWindow) * pw;
    const yOf = (v: number) => py + ph - v * ph;
    ctx.strokeStyle = '#26282c';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText('1', px - 10, py + 8);
    ctx.fillText('0', px - 10, py + ph + 4);
    // analytic
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(232,228,220,0.45)';
    ctx.beginPath();
    for (let i = 0; i <= 200; i += 1) {
      const tt = (i / 200) * tWindow;
      const y = yOf(gaussianContrast(row.sigma, tt));
      if (i === 0) ctx.moveTo(xOf(tt), y);
      else ctx.lineTo(xOf(tt), y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // sampled contrast up to t
    ctx.strokeStyle = row.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const steps = 160;
    for (let i = 0; i <= steps; i += 1) {
      const tt = (i / steps) * t;
      let ax = 0;
      let ay = 0;
      for (let k = 0; k < draws.length; k += 1) {
        const phi = 2 * Math.PI * row.sigma * (draws[k] ?? 0) * tt;
        ax += Math.cos(phi);
        ay += Math.sin(phi);
      }
      const cc = Math.hypot(ax, ay) / draws.length;
      if (i === 0) ctx.moveTo(xOf(tt), yOf(cc));
      else ctx.lineTo(xOf(tt), yOf(cc));
    }
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(xOf(t), yOf(c), 3.5, 0, 2 * Math.PI);
    ctx.fill();
    // T2* marker
    const t2 = dephasingTimeS(row.sigma);
    if (t2 < tWindow) {
      ctx.strokeStyle = '#3a3c40';
      ctx.beginPath();
      ctx.moveTo(xOf(t2), py);
      ctx.lineTo(xOf(t2), py + ph);
      ctx.stroke();
      ctx.fillStyle = MUTED;
      ctx.font = MONO;
      ctx.fillText(`T₂* = ${(t2 * 1e3).toFixed(2)} ms`, xOf(t2) + 4, py + 12);
    }
    ctx.fillStyle = MUTED;
    ctx.fillText(`contrast · ${(c * 100).toFixed(0)}%`, px + pw - 110, py + ph - 6);
  }
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(`t = ${(t * 1e3).toFixed(2)} ms`, px, H - 8);
  ctx.fillText(`${(tWindow * 1e3).toFixed(0)} ms`, px + pw - 30, H - 22);
}
