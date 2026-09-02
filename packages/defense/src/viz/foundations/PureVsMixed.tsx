import { useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { blochFromAngles, mixture, pPlusAlong, purity, type Vec3 } from '../../physics/qubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, bars, CREAM, drawSphere, drawVector, frame, lcg, MONO, MUTED, SANS, toScreen, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 340;
const N = 12;
type Axis = 'z' | 'x';

const PURE: readonly Vec3[] = Array.from({ length: N }, () => blochFromAngles(Math.PI / 2, 0));
const MIXED: readonly Vec3[] = Array.from({ length: N }, (_, i) => blochFromAngles(i % 2 === 0 ? 0 : Math.PI, 0));

export function PureVsMixed() {
  const [axis, setAxis] = useState<Axis>('z');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tally = useRef({ pure: [0, 0], mixed: [0, 0], t: 0 });
  const rand = useRef(lcg(3));
  const [, force] = useState(0);

  const n: Vec3 = axis === 'z' ? [0, 0, 1] : [1, 0, 0];
  const reset = (a: Axis) => {
    setAxis(a);
    tally.current = { pure: [0, 0], mixed: [0, 0], t: 0 };
  };

  useRaf(
    (nowMs) => {
      const tl = tally.current;
      // one simulated shot per ~60 ms, until 400 shots
      if (nowMs - tl.t > 60 && tl.pure[0]! + tl.pure[1]! < 400) {
        tl.t = nowMs;
        const r = rand.current;
        const pPure = pPlusAlong(PURE[0]!, n);
        const k = Math.floor(r() * N);
        const pMixed = pPlusAlong(MIXED[k]!, n);
        if (r() < pPure) tl.pure[0]! += 1;
        else tl.pure[1]! += 1;
        if (r() < pMixed) tl.mixed[0]! += 1;
        else tl.mixed[1]! += 1;
        force((v) => v + 1);
      }
      const canvas = canvasRef.current;
      if (canvas === null) return;
      draw(canvas, axis, tl.pure as [number, number], tl.mixed as [number, number]);
    },
    true,
    canvasRef,
  );

  return (
    <Figure
      n="F6"
      title="Superposition is not ignorance"
      caption={
        <>
          Left: {N} qubits all prepared in |+⟩ = (|0⟩ + |1⟩)/√2 — a pure superposition, every
          Bloch vector along +x. Right: {N} qubits each prepared in |0⟩ or |1⟩ at random — a
          classical mixture; its average Bloch vector is zero. Measured along z both give 50/50
          and are indistinguishable. Measured along x (a π/2 pulse then a z measurement) the pure
          state answers +1 every time and the mixture stays 50/50. That difference is the entire
          content of &ldquo;quantum&rdquo; in a qubit: the phase between α and β is real. Purity
          Tr ρ² = (1 + |r|²)/2: {purity(PURE[0]!).toFixed(2)} for |+⟩,{' '}
          {purity(mixture(MIXED)).toFixed(2)} for the mixture. Decoherence is exactly the process
          that turns the left picture into the right one.
        </>
      }
    >
      <Panel tag="a" title="Same statistics along z; different along x" wide>
        <div className="mode-row">
          <button type="button" className={axis === 'z' ? 'active' : undefined} onClick={() => reset('z')}>
            measure along z (is it |0⟩ or |1⟩?)
          </button>
          <button type="button" className={axis === 'x' ? 'active' : undefined} onClick={() => reset('x')}>
            measure along x (is it |+⟩ or |−⟩?)
          </button>
        </div>
        <canvas ref={canvasRef} className="sketch" />
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, axis: Axis, pure: [number, number], mixed: [number, number]): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const cols = [
    { x: 165, title: 'pure: every atom in |+⟩', states: PURE, tally: pure, color: VIOLET },
    { x: 495, title: 'mixed: each atom |0⟩ or |1⟩, unknown which', states: MIXED, tally: mixed, color: AMBER },
  ];
  const n: Vec3 = axis === 'z' ? [0, 0, 1] : [1, 0, 0];
  for (const c of cols) {
    ctx.fillStyle = CREAM;
    ctx.font = SANS;
    ctx.textAlign = 'center';
    ctx.fillText(c.title, c.x, 22);
    ctx.textAlign = 'left';
    const cy = 130;
    const R = 78;
    drawSphere(ctx, c.x, cy, R);
    // measurement axis
    const p = toScreen(n, c.x, cy, R);
    ctx.strokeStyle = BLUE;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c.x - (p[0] - c.x) * 1.25, cy - (p[1] - cy) * 1.25);
    ctx.lineTo(c.x + (p[0] - c.x) * 1.25, cy + (p[1] - cy) * 1.25);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = BLUE;
    ctx.font = MONO;
    ctx.fillText(`measure ${axis}`, c.x + (p[0] - c.x) * 1.3 - 20, cy + (p[1] - cy) * 1.3 - 6);
    // states (with slight jitter so identical vectors are visible)
    c.states.forEach((s, i) => {
      const j = (i - N / 2) * 0.012;
      const v: Vec3 = [s[0] + j * s[2], s[1] + j, s[2] - j * s[0]];
      drawVector(ctx, c.x, cy, R, v, c.color, 1.4, 3);
    });
    const avg = mixture(c.states);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.textAlign = 'center';
    ctx.fillText(`average vector |r| = ${Math.hypot(...avg).toFixed(2)}  ·  purity ${purity(avg).toFixed(2)}`, c.x, cy + R + 30);
    ctx.textAlign = 'left';
    // tallies
    const total = c.tally[0] + c.tally[1];
    const fx = c.x - 120;
    frame(ctx, fx, 250, 240, 78);
    const lbl = axis === 'z' ? ['|0⟩', '|1⟩'] : ['|+⟩', '|−⟩'];
    bars(ctx, fx + 30, 262, 180, 44, [
      { label: lbl[0]!, frac: total ? c.tally[0] / total : 0, color: c.color },
      { label: lbl[1]!, frac: total ? c.tally[1] / total : 0, color: c.color },
    ]);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText(`${total} shots`, fx + 6, 262);
    if (total > 0) ctx.fillText(`${((100 * c.tally[0]) / total).toFixed(0)}% / ${((100 * c.tally[1]) / total).toFixed(0)}%`, fx + 160, 262);
  }
}
