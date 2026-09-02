import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { rbC6EstimateGHzUm6 } from '../../physics/beams.ts';
import { effectiveN } from '../../physics/orbitals.ts';
import { lifetimeS, meanRadiusUm, relativePolarizability, spacingGHz } from '../../physics/rydberg.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;
const N_MIN = 20;
const N_MAX = 100;

type Law = { label: string; exp: string; color: string; f: (n: number) => number; unit: string; fmt: (v: number) => string };

const LAWS: readonly Law[] = [
  { label: 'radius ⟨r⟩', exp: 'n*²', color: BLUE, f: (n) => meanRadiusUm(n), unit: 'μm', fmt: (v) => v.toFixed(3) },
  { label: 'lifetime (300 K)', exp: '~n*²–³', color: GREEN, f: (n) => lifetimeS(n) * 1e6, unit: 'μs', fmt: (v) => v.toFixed(0) },
  { label: 'polarizability', exp: 'n*⁷', color: AMBER, f: (n) => relativePolarizability(n), unit: '× (53S)', fmt: (v) => v.toExponential(2) },
  { label: 'C₆', exp: 'n*¹¹', color: VIOLET, f: (n) => rbC6EstimateGHzUm6(n), unit: 'GHz μm⁶', fmt: (v) => v.toExponential(2) },
  { label: 'level spacing', exp: 'n*⁻³', color: '#8fb8e0', f: (n) => spacingGHz(n), unit: 'GHz', fmt: (v) => v.toFixed(1) },
];

export function ScalingLaws() {
  const [n, setN] = useState<number>(PAPER.rydberg.n);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, n);
  }, [n]);
  return (
    <Figure
      n="F18"
      title="Scaling laws: why n ≈ 50–70 is the sweet spot"
      caption={
        <>
          Each property versus n on log–log axes, normalised to its value at n = {PAPER.rydberg.n} so
          the slopes — the scaling exponents — can be compared directly. Size grows as n*², the
          radiative lifetime as n*³ (with black-body decay flattening it to ~n*² at 300 K), the
          static polarizability as n*⁷ and the van der Waals coefficient C₆ as n*¹¹, while the
          level spacing falls as n*⁻³. The choice of n is a trade: higher n gives stronger,
          longer-range interactions (good for gates) but also more sensitivity to stray electric
          fields (∝ n*⁷), closer neighbouring levels, and larger orbits that eventually approach
          the interatomic distance. Values at the chosen n are listed; C₆ uses the n*¹¹ law
          anchored on the measured 70S value and is an estimate, not a paper number.
        </>
      }
    >
      <Panel tag="a" title={`n = ${n}`} wide>
        <Slider label="Principal quantum number n" value={n} min={N_MIN} max={N_MAX} step={1} onChange={setN} />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          {LAWS.map((l) => `${l.label} ${l.fmt(l.f(n))} ${l.unit}`).join(' · ')}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, n: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const px = 60;
  const py = 20;
  const pw = 400;
  const ph = 270;
  frame(ctx, px, py, pw, ph, 'value / value(53), log–log');
  const ref = PAPER.rydberg.n;
  const xOf = (k: number) => px + (Math.log(k / N_MIN) / Math.log(N_MAX / N_MIN)) * pw;
  const lo = -6;
  const hi = 4;
  const yOf = (ratio: number) => py + ph - ((Math.log10(ratio) - lo) / (hi - lo)) * ph;
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  for (let d = lo; d <= hi; d += 2) {
    ctx.strokeStyle = '#1a1b1e';
    ctx.beginPath();
    ctx.moveTo(px, yOf(10 ** d));
    ctx.lineTo(px + pw, yOf(10 ** d));
    ctx.stroke();
    ctx.fillText(d === 0 ? '×1' : `1e${d}`, px - 36, yOf(10 ** d) + 4);
  }
  for (const k of [20, 30, 50, 70, 100]) {
    ctx.strokeStyle = '#1a1b1e';
    ctx.beginPath();
    ctx.moveTo(xOf(k), py);
    ctx.lineTo(xOf(k), py + ph);
    ctx.stroke();
    ctx.fillText(`${k}`, xOf(k) - 6, py + ph + 14);
  }
  ctx.fillText('n →', px + pw + 30, py + ph + 14);
  for (const law of LAWS) {
    const base = law.f(ref);
    ctx.strokeStyle = law.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 160; i += 1) {
      const k = N_MIN * (N_MAX / N_MIN) ** (i / 160);
      const y = yOf(Math.max(1e-9, law.f(k) / base));
      if (i === 0) ctx.moveTo(xOf(k), y);
      else ctx.lineTo(xOf(k), y);
    }
    ctx.stroke();
  }
  // legend at the right edge, de-overlapped
  const ends = LAWS.map((law) => ({ law, y: yOf(law.f(N_MAX) / law.f(ref)) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) {
    const prev = ends[i - 1]!;
    const cur = ends[i]!;
    if (cur.y - prev.y < 14) cur.y = prev.y + 14;
  }
  for (const e of ends) {
    ctx.fillStyle = e.law.color;
    ctx.fillText(`${e.law.label} ∝ ${e.law.exp}`, px + pw + 8, Math.max(py + 10, Math.min(py + ph, e.y)) + 4);
  }
  // marker
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xOf(n), py);
  ctx.lineTo(xOf(n), py + ph);
  ctx.stroke();
  ctx.fillStyle = CREAM;
  for (const law of LAWS) {
    ctx.beginPath();
    ctx.arc(xOf(n), yOf(Math.max(1e-9, law.f(n) / law.f(ref))), 3.5, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = MUTED;
  ctx.fillText(`n* = ${effectiveN(n, 0).toFixed(2)}`, xOf(n) + 6, py + 14);
}
