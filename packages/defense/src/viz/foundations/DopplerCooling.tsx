import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { dopplerLimitK, dopplerTempK, GAMMA, K_D2, langevinStep, temperature1D, twoBeamForce } from '../../physics/cooling.ts';
import { HBAR } from '../../physics/light.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, lcg, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 340;
const N = 240;
const V_MAX = 12; // m/s plotted
const DT = 1e-6; // physical step
const STEPS_PER_FRAME = 40; // → 40 μs of physics per frame (~2.4 ms per second)

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function DopplerCooling() {
  const [detuning, setDetuning] = useState(-0.5); // Δ/Γ
  const [sat, setSat] = useState(0.3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rand = useRef(lcg(21));
  const sim = useRef<{ vs: Float64Array; tUs: number; hist: number[] }>({ vs: new Float64Array(0), tUs: 0, hist: [] });
  const [, force] = useState(0);

  const reset = () => {
    const vs = new Float64Array(N);
    for (let i = 0; i < N; i += 1) vs[i] = 4 * gaussian(rand.current);
    sim.current = { vs, tUs: 0, hist: [] };
  };
  if (sim.current.vs.length === 0) reset();
  useEffect(() => {
    sim.current.hist = [];
    sim.current.tUs = 0;
  }, [detuning, sat]);

  useRaf(
    () => {
      const s = sim.current;
      const d = detuning * GAMMA;
      if (detuning !== 0 && s.hist.length < 400) {
        for (let k = 0; k < STEPS_PER_FRAME; k += 1) {
          for (let i = 0; i < N; i += 1) s.vs[i] = langevinStep(s.vs[i]!, DT, sat, d, gaussian(rand.current));
        }
        s.tUs += STEPS_PER_FRAME * DT * 1e6;
        s.hist.push(temperature1D(s.vs));
      }
      const canvas = canvasRef.current;
      if (canvas === null) return;
      draw(canvas, detuning, sat, s.vs, s.hist, s.tUs);
      if (Math.floor(s.tUs / 200) !== Math.floor((s.tUs - STEPS_PER_FRAME * DT * 1e6) / 200)) force((v) => v + 1);
    },
    true,
    canvasRef,
  );

  const T = temperature1D(sim.current.vs);
  const tD = dopplerTempK(detuning);

  return (
    <Figure
      n="F14"
      title="Doppler cooling: a friction force made of light"
      caption={
        <>
          <strong>a</strong>, Net force on an atom from two counter-propagating beams, both
          detuned by Δ below resonance, versus the atom&rsquo;s velocity. An atom moving toward a
          beam sees it Doppler-shifted closer to resonance and scatters more of its photons —
          each kick ħk against the motion — so the net force opposes the velocity near v = 0:
          F ≈ −αv, friction. It works only over the capture range |v| ≲ |Δ|/k ≈ few m/s, which is
          why cold atoms are loaded from the slow tail of the thermal distribution (or a slowed
          beam). <strong>b</strong>, {N} atoms in one dimension, started at ~4 m/s rms and evolved
          with the same force plus the random recoil kicks of every absorbed and re-emitted photon
          (a Langevin simulation, diffusion D<sub>p</sub> = 2ħ²k²(R₊+R₋)). The friction cools; the
          random kicks heat; they balance at k<sub>B</sub>T = (ħΓ/4)(1 + (2Δ/Γ)²)/(2|Δ|/Γ), minimum
          ħΓ/2k<sub>B</sub> = {(dopplerLimitK() * 1e6).toFixed(0)} μK at Δ = −Γ/2. Set Δ positive
          and watch the beams heat instead.
        </>
      }
    >
      <Panel tag="a" title="Force curve and the cooling ensemble" wide>
        <div className="slider-pair">
          <Slider label="Detuning Δ/Γ" value={detuning} min={-3} max={1} step={0.05} display={detuning.toFixed(2)} onChange={setDetuning} />
          <Slider label="Saturation s per beam" value={sat} min={0.05} max={2} step={0.05} display={sat.toFixed(2)} onChange={setSat} />
        </div>
        <canvas ref={canvasRef} className="sketch" />
        <div className="mode-row">
          <button type="button" onClick={reset}>
            restart hot
          </button>
        </div>
        <p className="board-cap">
          t = {(sim.current.tUs / 1000).toFixed(2)} ms · ensemble T = {fmtT(T)} · Doppler prediction {detuning < 0 ? fmtT(tD) : 'heating (blue detuning)'} ·
          capture velocity |Δ|/k ≈ {(Math.abs(detuning) * GAMMA / K_D2).toFixed(1)} m/s · max force ≈ ħkΓ/2 = {((HBAR * K_D2 * GAMMA) / 2).toExponential(1)} N
        </p>
      </Panel>
    </Figure>
  );
}

function fmtT(tK: number): string {
  if (!Number.isFinite(tK)) return '∞';
  if (tK >= 1e-3) return `${(tK * 1e3).toFixed(2)} mK`;
  return `${(tK * 1e6).toFixed(0)} μK`;
}

function draw(canvas: HTMLCanvasElement, detuning: number, sat: number, vs: Float64Array, hist: readonly number[], tUs: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const d = detuning * GAMMA;
  // --- a: force curve
  const px = 40;
  const py = 24;
  const pw = 290;
  const ph = 200;
  frame(ctx, px, py, pw, ph, 'a  net force vs velocity');
  const fmax = (HBAR * K_D2 * GAMMA) / 2;
  const xOf = (v: number) => px + ((v + V_MAX) / (2 * V_MAX)) * pw;
  const yOf = (f: number) => py + ph / 2 - (f / fmax) * (ph / 2 - 20) * 2.2;
  ctx.strokeStyle = '#1d1e20';
  ctx.beginPath();
  ctx.moveTo(px, yOf(0));
  ctx.lineTo(px + pw, yOf(0));
  ctx.moveTo(xOf(0), py);
  ctx.lineTo(xOf(0), py + ph);
  ctx.stroke();
  ctx.strokeStyle = detuning < 0 ? BLUE : RED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 240; i += 1) {
    const v = -V_MAX + (i / 240) * 2 * V_MAX;
    const y = Math.max(py, Math.min(py + ph, yOf(twoBeamForce(v, sat, d))));
    if (i === 0) ctx.moveTo(xOf(v), y);
    else ctx.lineTo(xOf(v), y);
  }
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(`−${V_MAX} m/s`, px + 4, py + ph + 14);
  ctx.fillText(`+${V_MAX} m/s`, px + pw - 56, py + ph + 14);
  ctx.fillText('0', xOf(0) - 3, py + ph + 14);
  ctx.fillText(detuning < 0 ? 'force opposes velocity: friction' : detuning > 0 ? 'force follows velocity: heating' : 'no net force', px + 8, py + ph - 8);
  // atoms as ticks on the velocity axis
  ctx.fillStyle = AMBER;
  for (let i = 0; i < vs.length; i += 1) {
    const v = vs[i]!;
    if (Math.abs(v) > V_MAX) continue;
    ctx.fillRect(xOf(v) - 0.5, yOf(0) - 10, 1, 8);
  }

  // --- b: velocity histogram + temperature trace
  const hx = 360;
  const hy = 24;
  const hw = 280;
  const hh = 120;
  frame(ctx, hx, hy, hw, hh, `b  velocity histogram, t = ${(tUs / 1000).toFixed(2)} ms`);
  const bins = 48;
  let s2 = 0;
  for (let i = 0; i < vs.length; i += 1) s2 += vs[i]! * vs[i]!;
  const hRange = Math.max(0.3, 4 * Math.sqrt(s2 / vs.length));
  const counts = new Array<number>(bins).fill(0);
  for (let i = 0; i < vs.length; i += 1) {
    const b = Math.floor(((vs[i]! + hRange) / (2 * hRange)) * bins);
    if (b >= 0 && b < bins) counts[b] = (counts[b] ?? 0) + 1;
  }
  const cmax = Math.max(1, ...counts);
  const bw = hw / bins;
  counts.forEach((c, i) => {
    const bhh = (c / cmax) * (hh - 26);
    ctx.fillStyle = 'rgba(212,162,74,0.8)';
    ctx.fillRect(hx + i * bw, hy + hh - bhh, bw - 1, bhh);
  });
  ctx.fillStyle = MUTED;
  ctx.fillText(`−${hRange.toFixed(hRange < 1 ? 2 : 1)}`, hx + 2, hy + hh + 14);
  ctx.fillText(`+${hRange.toFixed(hRange < 1 ? 2 : 1)} m/s  (axis rescales)`, hx + hw - 150, hy + hh + 14);

  const tx = 360;
  const ty = 176;
  const tw = 280;
  const th = 120;
  frame(ctx, tx, ty, tw, th, 'temperature (log) vs time');
  const lo = Math.log10(30e-6);
  const hi = Math.log10(300e-3);
  const yT = (T: number) => ty + th - ((Math.log10(Math.max(T, 10 ** lo)) - lo) / (hi - lo)) * (th - 20);
  ctx.strokeStyle = GREEN;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(tx, yT(dopplerLimitK()));
  ctx.lineTo(tx + tw, yT(dopplerLimitK()));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = GREEN;
  ctx.fillText('Doppler limit 146 μK', tx + tw - 130, yT(dopplerLimitK()) - 4);
  if (detuning < 0) {
    const tD = dopplerTempK(detuning);
    ctx.strokeStyle = VIOLET;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(tx, yT(tD));
    ctx.lineTo(tx + tw, yT(tD));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = VIOLET;
    const clash = Math.abs(yT(tD) - yT(dopplerLimitK())) < 14;
    ctx.fillText(`prediction for this Δ: ${fmtT(tD)}`, tx + 6, yT(tD) + (clash ? 14 : -4));
  }
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  hist.forEach((T, i) => {
    const x = tx + (i / 400) * tw;
    const y = yT(T);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.fillText('30 μK', tx - 38, yT(30e-6) + 4);
  ctx.fillText('300 mK', tx - 44, yT(300e-3) + 4);
}
