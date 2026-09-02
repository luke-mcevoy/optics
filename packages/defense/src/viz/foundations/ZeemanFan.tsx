import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { PAPER } from '../../data/paper.ts';
import {
  breitRabiHz,
  clockQuadraticHzPerG2,
  clockSensitivityHzPerG,
  clockShiftHz,
  groundHyperfineHz,
  linearZeemanHzPerG,
  RB87_HFS,
} from '../../physics/hyperfine.ts';
import { clear, sizeCanvas } from '../canvas.ts';

const W = 660;
const H = 340;
const B_MAX = 30;

const MONO = '11px IBM Plex Mono, monospace';
const SANS = '12px Source Sans 3, sans-serif';
const BLUE = '#6ea8d4';
const CREAM = '#e8e4dc';
const MUTED = '#8b8680';
const RED = '#c81e1e';
const VIOLET = '#b08ad6';

export function ZeemanFan() {
  const [step, setStep] = useState(0);
  const [b, setB] = useState<number>(PAPER.cooling.bFieldG);
  const fanRef = useRef<HTMLCanvasElement | null>(null);
  const clockRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (fanRef.current) drawFan(fanRef.current, b, step);
    if (clockRef.current) drawClock(clockRef.current, b);
  }, [b, step]);

  const q = clockQuadraticHzPerG2();
  const shift = clockShiftHz(b);
  const sens = clockSensitivityHzPerG(b);
  const lin = linearZeemanHzPerG(2, 1);
  const ratio = sens > 0 ? lin / sens : Infinity;

  const steps: readonly StepDef[] = [
    {
      label: 'turn on a field',
      text: (
        <>
          Drag the field slider. A magnetic field gives the atom&rsquo;s magnet a preferred
          direction, and the eight sublevels — five in F = 2, three in F = 1 — fan out in
          energy according to their orientation m<sub>F</sub>. This is the Zeeman effect. The
          outer lines move fastest: the stretched states m<sub>F</sub> = ±2 shift by{' '}
          {(linearZeemanHzPerG(2, 2) / 1e6).toFixed(2)} MHz per gauss.
        </>
      ),
    },
    {
      label: 'the pair that stays put',
      text: (
        <>
          Two lines do not fan out: m<sub>F</sub> = 0 in each manifold. Their magnet has no
          projection along the field, so to first order the field does nothing to them. Their
          neighbours m<sub>F</sub> = ±1 move at ±{(lin / 1e6).toFixed(2)} MHz/G — a stray field
          of a milligauss would shift them by 700 Hz, and a qubit stored there would forget
          its phase in under a millisecond. The m<sub>F</sub> = 0 pair is the natural home
          for a bit.
        </>
      ),
    },
    {
      label: 'not perfectly still',
      text: (
        <>
          Panel <strong>b</strong> zooms in on the clock transition itself. It is not exactly
          flat: at second order the field mixes m<sub>F</sub> = 0 with its neighbours and the
          transition frequency curves upward as {q.toFixed(1)} Hz/G² × B². That number is the
          whole residual sensitivity, and it comes straight from the Breit–Rabi formula with
          the electron and nuclear g-factors.
        </>
      ),
    },
    {
      label: `the paper’s ${PAPER.cooling.bFieldG} G`,
      text: (
        <>
          The experiment runs at {PAPER.cooling.bFieldG} G so the sublevels are well separated
          for optical pumping and imaging. There the clock transition is shifted by{' '}
          {(shift / 1e3).toFixed(1)} kHz and its slope is {(sens / 1e3).toFixed(1)} kHz/G —{' '}
          {Math.round(ratio)}× less sensitive to field noise than the m<sub>F</sub> = ±1 pair
          would be. The next figure turns that number into a coherence time.
        </>
      ),
    },
  ];

  return (
    <>
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="F3"
        title="Zeeman effect on the ground state, and the clock pair"
        caption={
          <>
            <strong>a</strong>, Breit–Rabi energies of the eight 5S<sub>1/2</sub> sublevels
            versus magnetic field, each manifold plotted relative to its zero-field energy
            (F = 2 at +{(groundHyperfineHz(2) / 1e9).toFixed(3)} GHz, F = 1 at{' '}
            {(groundHyperfineHz(1) / 1e9).toFixed(3)} GHz). Slopes at low field are g<sub>F</sub>{' '}
            m<sub>F</sub> μ<sub>B</sub>/h with g<sub>F</sub> ≈ ±1/2 (±{(lin / 1e6).toFixed(3)}{' '}
            MHz/G for m<sub>F</sub> = ±1). <strong>b</strong>, Frequency of the m<sub>F</sub> = 0 →
            m<sub>F</sub> = 0 clock transition relative to its zero-field value{' '}
            {(RB87_HFS.groundSplittingHz / 1e9).toFixed(9)} GHz, from the exact Breit–Rabi
            expression ΔE(√(1 + x²) − 1); the small-field limit is {q.toFixed(2)} Hz/G². The
            marker is the paper&rsquo;s operating field. Constants: g<sub>J</sub> ={' '}
            {RB87_HFS.gJ}, g<sub>I</sub> = {RB87_HFS.gI}, μ<sub>B</sub>/h ={' '}
            {(RB87_HFS.muBHzPerG / 1e6).toFixed(6)} MHz/G (Steck).
          </>
        }
      >
        <Panel tag="a" title="Sublevel energies vs field" wide>
          <Slider label="Bias field B" value={b} min={0} max={B_MAX} step={0.1} unit="G" display={b.toFixed(1)} onChange={setB} />
          <canvas ref={fanRef} className="sketch" />
        </Panel>
        <Panel tag="b" title="Clock transition shift" wide dim={step < 2}>
          <canvas ref={clockRef} className="sketch" />
          <p className="board-cap">
            at B = {b.toFixed(1)} G: shift {(shift / 1e3).toFixed(2)} kHz · slope {(sens / 1e3).toFixed(2)} kHz/G ·
            m<sub>F</sub> = ±1 slope {(lin / 1e3).toFixed(0)} kHz/G
          </p>
        </Panel>
      </Figure>
    </>
  );
}

function drawFan(canvas: HTMLCanvasElement, bNow: number, step: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const px = 70;
  const pw = W - px - 150;
  const panels: readonly { F: number; y0: number; h: number }[] = [
    { F: 2, y0: 24, h: 130 },
    { F: 1, y0: 190, h: 110 },
  ];
  const yMaxMHz = 45; // ± range per manifold

  for (const p of panels) {
    const e0 = groundHyperfineHz(p.F);
    const yOf = (hz: number) => p.y0 + p.h / 2 - ((hz - e0) / 1e6 / yMaxMHz) * (p.h / 2);
    const xOf = (bb: number) => px + (bb / B_MAX) * pw;
    ctx.strokeStyle = '#26282c';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, p.y0, pw, p.h);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillStyle = CREAM;
    ctx.fillText(`F = ${p.F}`, px + 8, p.y0 + 14);
    ctx.fillStyle = MUTED;
    ctx.fillText(`+${yMaxMHz} MHz`, px - 62, p.y0 + 4);
    ctx.fillText(`−${yMaxMHz} MHz`, px - 62, p.y0 + p.h + 4);
    // zero-field line
    ctx.strokeStyle = '#1d1e20';
    ctx.beginPath();
    ctx.moveTo(px, yOf(e0));
    ctx.lineTo(px + pw, yOf(e0));
    ctx.stroke();

    for (let m = -p.F; m <= p.F; m += 1) {
      const isClock = m === 0;
      ctx.strokeStyle = isClock ? CREAM : BLUE;
      ctx.lineWidth = isClock ? 2.4 : 1.4;
      ctx.globalAlpha = step >= 1 && !isClock ? 0.5 : 1;
      ctx.beginPath();
      for (let i = 0; i <= 120; i += 1) {
        const bb = (i / 120) * B_MAX;
        const y = yOf(breitRabiHz(p.F, m, bb));
        if (i === 0) ctx.moveTo(xOf(bb), y);
        else ctx.lineTo(xOf(bb), y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      const yEnd = yOf(breitRabiHz(p.F, m, B_MAX));
      if (yEnd > p.y0 - 6 && yEnd < p.y0 + p.h + 6) {
        ctx.fillStyle = isClock ? CREAM : MUTED;
        ctx.font = MONO;
        ctx.fillText(`m_F = ${m > 0 ? '+' : ''}${m}`, px + pw + 8, yEnd + 4);
      }
      // marker at current field
      const yb = yOf(breitRabiHz(p.F, m, bNow));
      if (yb > p.y0 && yb < p.y0 + p.h) {
        ctx.fillStyle = isClock ? CREAM : BLUE;
        ctx.beginPath();
        ctx.arc(xOf(bNow), yb, isClock ? 4 : 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xOf(bNow), p.y0);
    ctx.lineTo(xOf(bNow), p.y0 + p.h);
    ctx.stroke();
  }
  // x axis
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  for (let g = 0; g <= B_MAX; g += 10) {
    const x = px + (g / B_MAX) * pw;
    ctx.fillText(`${g} G`, x - 8, H - 18);
  }
  ctx.fillText('magnetic field', px + pw / 2 - 40, H - 4);
  ctx.fillStyle = CREAM;
  ctx.font = SANS;
  ctx.fillText(`B = ${bNow.toFixed(1)} G`, px + (bNow / B_MAX) * pw + 6, 14 + 0);
}

function drawClock(canvas: HTMLCanvasElement, bNow: number): void {
  const CH = 220;
  const ctx = sizeCanvas(canvas, W, CH);
  clear(ctx, W, CH, '#0c0d0e');
  const px = 80;
  const py = 20;
  const pw = W - px - 40;
  const ph = CH - 60;
  const maxKHz = clockShiftHz(B_MAX) / 1e3;
  const xOf = (bb: number) => px + (bb / B_MAX) * pw;
  const yOf = (khz: number) => py + ph - (khz / maxKHz) * ph;

  ctx.strokeStyle = '#26282c';
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('0', px - 14, py + ph + 4);
  ctx.fillText(`${maxKHz.toFixed(0)} kHz`, px - 62, py + 8);
  ctx.fillText('clock shift  ν(B) − ν(0)', px + 6, py + 14);
  for (let g = 0; g <= B_MAX; g += 10) ctx.fillText(`${g} G`, xOf(g) - 8, py + ph + 18);

  // exact Breit–Rabi curve
  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 150; i += 1) {
    const bb = (i / 150) * B_MAX;
    const y = yOf(clockShiftHz(bb) / 1e3);
    if (i === 0) ctx.moveTo(xOf(bb), y);
    else ctx.lineTo(xOf(bb), y);
  }
  ctx.stroke();
  // tangent at current field
  const s = clockSensitivityHzPerG(bNow) / 1e3; // kHz/G
  const y0 = clockShiftHz(bNow) / 1e3;
  ctx.strokeStyle = 'rgba(232, 228, 220, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  const bA = Math.max(0, bNow - 6);
  const bB = Math.min(B_MAX, bNow + 6);
  ctx.moveTo(xOf(bA), yOf(y0 + s * (bA - bNow)));
  ctx.lineTo(xOf(bB), yOf(y0 + s * (bB - bNow)));
  ctx.stroke();
  ctx.setLineDash([]);
  // paper field marker
  const bp = PAPER.cooling.bFieldG;
  ctx.strokeStyle = '#3a3c40';
  ctx.beginPath();
  ctx.moveTo(xOf(bp), py);
  ctx.lineTo(xOf(bp), py + ph);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.fillText(`paper: ${bp} G`, xOf(bp) + 4, py + 48);
  // current
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(xOf(bNow), yOf(y0), 4.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.font = SANS;
  ctx.fillText(`${y0.toFixed(1)} kHz · slope ${s.toFixed(1)} kHz/G`, xOf(bNow) + 10, yOf(y0) - 8);
  ctx.fillStyle = VIOLET;
  ctx.font = MONO;
  ctx.fillText(`≈ ${clockQuadraticHzPerG2().toFixed(1)} Hz/G² × B²  (Breit–Rabi, exact curve)`, px + 6, py + 30);
}
