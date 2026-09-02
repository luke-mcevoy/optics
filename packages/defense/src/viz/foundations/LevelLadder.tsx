import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { PAPER } from '../../data/paper.ts';
import { clockShiftHz, groundHyperfineHz, RB87_HFS } from '../../physics/hyperfine.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';

const W = 660;
const H = 380;
const PLOT_TOP = 26;
const PLOT_H = H - 60;

type View = { center: number; span: number };

const D1 = RB87_HFS.d1Hz;
const D2 = RB87_HFS.d2Hz;
const P_COG = (4 * D2 + 2 * D1) / 6;
const F1 = groundHyperfineHz(1);
const F2 = groundHyperfineHz(2);
const FS_THZ = (D2 - D1) / 1e12;
const HFS_GHZ = RB87_HFS.groundSplittingHz / 1e9;
const CLOCK_SHIFT_HZ = clockShiftHz(PAPER.cooling.bFieldG);

const VIEWS: readonly View[] = [
  { center: 192e12, span: 470e12 }, // gross
  { center: P_COG, span: 26e12 }, // fine
  { center: 0, span: 19e9 }, // hyperfine, ground
  { center: 0, span: 19e9 }, // qubit
  { center: 0, span: 19e9 }, // scale bar (own drawing)
];

const fmtHz = (hz: number): string => {
  const a = Math.abs(hz);
  if (a >= 1e12) return `${(hz / 1e12).toPrecision(4)} THz`;
  if (a >= 1e9) return `${(hz / 1e9).toPrecision(4)} GHz`;
  if (a >= 1e6) return `${(hz / 1e6).toPrecision(4)} MHz`;
  if (a >= 1e3) return `${(hz / 1e3).toPrecision(4)} kHz`;
  return `${hz.toPrecision(3)} Hz`;
};

export function LevelLadder() {
  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<View>({ ...VIEWS[0]! });
  const fromRef = useRef<View>({ ...VIEWS[0]! });
  const t0Ref = useRef<number>(performance.now());

  useEffect(() => {
    fromRef.current = { ...viewRef.current };
    t0Ref.current = performance.now();
  }, [step]);

  useRaf((nowMs) => {
    const goal = VIEWS[Math.min(step, 3)]!;
    const from = fromRef.current;
    const u = Math.min(1, Math.max(0, (nowMs - t0Ref.current) / 1800));
    const e = u * u * (3 - 2 * u);
    // Zoom uniformly in log-span across ten decades; the centre must arrive as the window
    // shrinks, so its remaining offset is tied to the remaining excess span.
    const span = Math.exp(Math.log(from.span) + (Math.log(goal.span) - Math.log(from.span)) * e);
    const frac = Math.abs(from.span - goal.span) < 1 ? 1 - e : (span - goal.span) / (from.span - goal.span);
    const v = viewRef.current;
    v.span = span;
    v.center = goal.center + (from.center - goal.center) * frac;
    const canvas = canvasRef.current;
    if (canvas === null) return;
    if (step === 4) drawScaleBar(canvas);
    else drawLadder(canvas, v, step);
  }, true, canvasRef);

  const steps: readonly StepDef[] = [
    {
      label: 'one electron, two rungs',
      text: (
        <>
          A rubidium atom has one outer electron, and its energy can only take certain values —
          rungs on a ladder. The bottom rung is 5S; the next is 5P, {fmtHz(P_COG)} higher. Light
          at that frequency (780–795 nm, deep red) lifts the electron up a rung. Everything
          this machine does with lasers starts from this picture.
        </>
      ),
    },
    {
      label: 'fine structure',
      text: (
        <>
          Zoom in on the 5P rung and it is really two: 5P<sub>1/2</sub> and 5P<sub>3/2</sub>,{' '}
          {FS_THZ.toFixed(2)} THz apart. The electron is a tiny magnet and it is orbiting the
          nucleus; the magnet interacts with the orbital motion (spin–orbit coupling), and the
          two relative orientations have different energies. This is the split between the D1
          (795 nm) and D2 (780 nm) lines the paper uses for cooling, imaging and the lattice.
        </>
      ),
    },
    {
      label: 'hyperfine structure',
      text: (
        <>
          Now zoom in on the <em>ground</em> rung, 5S, by a factor of about{' '}
          {Math.round(VIEWS[0]!.span / VIEWS[2]!.span / 1000)},000 relative to the first view. It too is
          double: the nucleus is also a magnet — about 670 times weaker than the electron&rsquo;s
          — and the two can sit aligned (F = 2) or opposed (F = 1). The gap is{' '}
          {HFS_GHZ.toFixed(3)} GHz: a microwave, not light. This is <em>hyperfine
          structure</em>, and these two rungs are the qubit.
        </>
      ),
    },
    {
      label: 'the qubit',
      text: (
        <>
          Each rung is itself a bundle of sublevels labelled m<sub>F</sub> — the orientation
          of the atom&rsquo;s total magnet. At zero field they coincide. The paper stores its
          bit in the two m<sub>F</sub> = 0 sublevels: |0⟩ = |F=1, m<sub>F</sub>=0⟩ and |1⟩ =
          |F=2, m<sub>F</sub>=0⟩, joined by the {HFS_GHZ.toFixed(3)} GHz transition. The next
          two figures show why those two, of the eight, are the right choice.
        </>
      ),
    },
    {
      label: 'how small is small',
      text: (
        <>
          All four energy scales on one logarithmic axis. Optical to fine structure is a factor
          ~50; fine to hyperfine ~1,000; hyperfine to the clock-state shift at the paper&rsquo;s{' '}
          {PAPER.cooling.bFieldG} G field, another ~160,000. Each layer is a small correction to the
          one above — and the qubit lives in the smallest one, which is exactly why it is so
          well protected.
        </>
      ),
    },
  ];

  return (
    <>
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="F1"
        title="The rubidium ladder, zoomed layer by layer"
        caption={
          <>
            Energy levels of the ⁸⁷Rb valence electron drawn to scale at each zoom; the window
            height is printed on the right. Gross structure: 5S → 5P at {fmtHz(P_COG)} (weighted
            centre of the D lines). Fine structure: 5P<sub>1/2</sub> / 5P<sub>3/2</sub> split by{' '}
            {FS_THZ.toFixed(3)} THz (D1 {fmtHz(D1)}, D2 {fmtHz(D2)}). Hyperfine structure: ground
            F = 1 / F = 2 split by {HFS_GHZ.toFixed(6)} GHz, with F = 2 at +3/8 and F = 1 at −5/8
            of the splitting from the centre of gravity. Sublevels shown at zero field. Data:
            Steck, <em>Rubidium 87 D Line Data</em>. The paper&rsquo;s qubit is the pair of
            m<sub>F</sub> = 0 sublevels (Methods).
          </>
        }
      >
        <Panel tag="a" title="Energy of the valence electron (E/h)" wide>
          <canvas ref={canvasRef} className="sketch" />
        </Panel>
      </Figure>
    </>
  );
}

/* ------------------------------------------------------------------ drawing */

const MONO = '11px IBM Plex Mono, monospace';
const SANS = '12px Source Sans 3, sans-serif';

type Lvl = { e: number; label: string; color: string; group: 'S' | 'P' | 'P12' | 'P32' | 'F1' | 'F2'; x0: number; x1: number };

const AMBER = '#d4a24a';
const BLUE = '#6ea8d4';
const CREAM = '#e8e4dc';
const MUTED = '#8b8680';

function levels(span: number): Lvl[] {
  const out: Lvl[] = [];
  // Excited state: one line until the fine structure resolves, then two, then hyperfine.
  if (span > 80e12) {
    out.push({ e: P_COG, label: '5P', color: AMBER, group: 'P', x0: 120, x1: 420 });
  } else if (span > 4e9) {
    out.push({ e: D1, label: '5P 1/2   (D1 line, 795 nm)', color: AMBER, group: 'P12', x0: 120, x1: 420 });
    out.push({ e: D2, label: '5P 3/2   (D2 line, 780 nm)', color: AMBER, group: 'P32', x0: 120, x1: 420 });
  }
  // Ground state.
  if (span > 60e9) {
    out.push({ e: 0, label: '5S 1/2', color: BLUE, group: 'S', x0: 120, x1: 420 });
  } else {
    out.push({ e: F2, label: 'F = 2   (I and J aligned)', color: BLUE, group: 'F2', x0: 120, x1: 420 });
    out.push({ e: F1, label: 'F = 1   (I and J opposed)', color: BLUE, group: 'F1', x0: 120, x1: 420 });
  }
  return out;
}

function drawLadder(canvas: HTMLCanvasElement, v: View, step: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const yOf = (e: number) => PLOT_TOP + PLOT_H / 2 - ((e - v.center) / v.span) * PLOT_H;

  // axis
  ctx.strokeStyle = '#26282c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, PLOT_TOP);
  ctx.lineTo(60, PLOT_TOP + PLOT_H);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('energy →', 8, PLOT_TOP - 8);

  // window height scale bar (right)
  const sx = W - 34;
  ctx.strokeStyle = '#3a3c40';
  ctx.beginPath();
  ctx.moveTo(sx, PLOT_TOP);
  ctx.lineTo(sx, PLOT_TOP + PLOT_H);
  ctx.moveTo(sx - 5, PLOT_TOP);
  ctx.lineTo(sx + 5, PLOT_TOP);
  ctx.moveTo(sx - 5, PLOT_TOP + PLOT_H);
  ctx.lineTo(sx + 5, PLOT_TOP + PLOT_H);
  ctx.stroke();
  ctx.save();
  ctx.translate(sx + 14, PLOT_TOP + PLOT_H / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.fillText(`window: ${fmtHz(v.span)}`, 0, 0);
  ctx.restore();

  const lv = levels(v.span);
  for (const l of lv) {
    const y = yOf(l.e);
    if (y < PLOT_TOP - 30 || y > PLOT_TOP + PLOT_H + 30) continue;
    const inside = y >= PLOT_TOP && y <= PLOT_TOP + PLOT_H;
    ctx.globalAlpha = inside ? 1 : 0.25;
    ctx.strokeStyle = l.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l.x0, y);
    ctx.lineTo(l.x1, y);
    ctx.stroke();
    ctx.fillStyle = l.color;
    ctx.font = SANS;
    ctx.fillText(l.label, l.x1 + 10, y + 4);
    ctx.globalAlpha = 1;
  }

  // off-screen pointers
  const groundY = yOf(0);
  if (groundY > PLOT_TOP + PLOT_H + 30) {
    ctx.fillStyle = BLUE;
    ctx.font = MONO;
    ctx.fillText(`↓ 5S ground state, ${fmtHz(v.center)} below this window`, 120, PLOT_TOP + PLOT_H + 18);
  }
  const pY = yOf(P_COG);
  if (pY < PLOT_TOP - 30) {
    ctx.fillStyle = AMBER;
    ctx.font = MONO;
    ctx.fillText(`↑ 5P, ${fmtHz(P_COG - v.center)} above this window`, 120, PLOT_TOP - 8 + 0);
  }

  // brackets with splittings
  const bracket = (e1: number, e2: number, x: number, text: string, color: string) => {
    const y1 = yOf(e1);
    const y2 = yOf(e2);
    if (Math.abs(y1 - y2) < 14) return;
    if (Math.max(y1, y2) < PLOT_TOP || Math.min(y1, y2) > PLOT_TOP + PLOT_H) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.moveTo(x - 4, y1);
    ctx.lineTo(x + 4, y1);
    ctx.moveTo(x - 4, y2);
    ctx.lineTo(x + 4, y2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = MONO;
    ctx.fillText(text, x + 10, (y1 + y2) / 2 + 4);
  };
  if (v.span > 80e12) bracket(0, P_COG, 100, `${fmtHz(P_COG)} · 780–795 nm light`, CREAM);
  if (v.span <= 80e12 && v.span > 4e9) bracket(D1, D2, 100, `${FS_THZ.toFixed(3)} THz  fine structure`, AMBER);
  if (v.span <= 60e9) bracket(F1, F2, 100, `${HFS_GHZ.toFixed(4)} GHz  hyperfine`, BLUE);

  // m_F sublevels at zero field, fanned horizontally
  if (v.span <= 60e9) {
    const drawSub = (F: number, e: number) => {
      const y = yOf(e);
      const n = 2 * F + 1;
      const w = 34;
      const gap = 10;
      const total = n * w + (n - 1) * gap;
      const x0 = 270 - total / 2;
      for (let i = 0; i < n; i += 1) {
        const m = i - F;
        const x = x0 + i * (w + gap);
        const isClock = m === 0 && step >= 3;
        ctx.strokeStyle = isClock ? CREAM : BLUE;
        ctx.lineWidth = isClock ? 3 : 1.2;
        ctx.globalAlpha = step >= 3 && !isClock ? 0.45 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + w, y - 6);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = isClock ? CREAM : MUTED;
        ctx.font = MONO;
        ctx.textAlign = 'center';
        ctx.fillText(`${m > 0 ? '+' : ''}${m}`, x + w / 2, y - 10);
        ctx.textAlign = 'left';
      }
    };
    drawSub(2, F2);
    drawSub(1, F1);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText('m_F  →', 380, yOf(F2) - 22);
  }

  // qubit arrow
  if (step >= 3 && v.span <= 60e9) {
    const y1 = yOf(F1) - 6;
    const y2 = yOf(F2) - 6;
    const x = 270 + 17;
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y1 - 4);
    ctx.lineTo(x, y2 + 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y2 + 2);
    ctx.lineTo(x - 4, y2 + 10);
    ctx.lineTo(x + 4, y2 + 10);
    ctx.closePath();
    ctx.fillStyle = CREAM;
    ctx.fill();
    ctx.font = SANS;
    ctx.fillText('|0⟩ ↔ |1⟩  the qubit  ·  6.834 682 611 GHz', x + 12, (y1 + y2) / 2 + 4);
  }
}

function drawScaleBar(canvas: HTMLCanvasElement): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const x0 = 70;
  const x1 = W - 80;
  const y = 200;
  const lo = 3; // 1 kHz
  const hi = 15; // 1 PHz
  const xOf = (hz: number) => x0 + ((Math.log10(hz) - lo) / (hi - lo)) * (x1 - x0);

  ctx.strokeStyle = '#3a3c40';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  for (let d = lo; d <= hi; d += 1) {
    const x = xOf(10 ** d);
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.stroke();
    if (d % 3 === 0) {
      ctx.textAlign = 'center';
      ctx.fillText(['kHz', 'MHz', 'GHz', 'THz', 'PHz'][(d - 3) / 3] ?? '', x, y + 20);
    }
  }
  ctx.textAlign = 'left';
  ctx.fillText('frequency (log scale) — each tick is ×10', x0, 40);

  const marks: readonly { hz: number; label: string; sub: string; color: string; up: boolean }[] = [
    { hz: P_COG, label: 'optical  5S → 5P', sub: fmtHz(P_COG), color: CREAM, up: true },
    { hz: D2 - D1, label: 'fine structure', sub: fmtHz(D2 - D1), color: AMBER, up: false },
    { hz: RB87_HFS.groundSplittingHz, label: 'hyperfine (the qubit)', sub: fmtHz(RB87_HFS.groundSplittingHz), color: BLUE, up: true },
    { hz: CLOCK_SHIFT_HZ, label: `clock shift at ${PAPER.cooling.bFieldG} G`, sub: fmtHz(CLOCK_SHIFT_HZ), color: '#b08ad6', up: false },
  ];
  for (const m of marks) {
    const x = xOf(m.hz);
    const dir = m.up ? -1 : 1;
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + dir * 46);
    ctx.stroke();
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = SANS;
    ctx.textAlign = 'center';
    ctx.fillText(m.label, x, y + dir * 60 + (m.up ? 0 : 8));
    ctx.font = MONO;
    ctx.fillStyle = MUTED;
    ctx.fillText(m.sub, x, y + dir * 76 + (m.up ? 0 : 8));
  }
  // ratios
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  const ratio = (a: number, b: number, yy: number) => {
    const xa = xOf(a);
    const xb = xOf(b);
    ctx.strokeStyle = '#2e3034';
    ctx.beginPath();
    ctx.moveTo(xa, yy);
    ctx.lineTo(xb, yy);
    ctx.stroke();
    ctx.fillText(`÷ ${Math.round(a / b).toLocaleString()}`, (xa + xb) / 2, yy - 5);
  };
  ratio(P_COG, D2 - D1, 320);
  ratio(D2 - D1, RB87_HFS.groundSplittingHz, 340);
  ratio(RB87_HFS.groundSplittingHz, CLOCK_SHIFT_HZ, 320);
  ctx.textAlign = 'left';
}
