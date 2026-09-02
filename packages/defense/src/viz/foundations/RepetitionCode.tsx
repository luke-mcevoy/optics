import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { repetitionLogicalError } from '../../physics/qec.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, lcg, MONO, MUTED, RED } from './bloch2d.ts';

const W = 660;
const H = 330;
const NS = [1, 3, 5, 7] as const;

type Word = { bits: number[]; flipped: boolean[]; x: number; decoded: number; ok: boolean };
type Sim = { words: Word[]; sent: number; wrong: number; emit: number };

export function RepetitionCode() {
  const [p, setP] = useState(0.15);
  const [n, setN] = useState<number>(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sim = useRef<Sim>({ words: [], sent: 0, wrong: 0, emit: 0 });
  const rand = useRef(lcg(23));
  const last = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sim.current = { words: [], sent: 0, wrong: 0, emit: 0 };
  }, [p, n]);

  useRaf(
    (now) => {
      const canvas = canvasRef.current;
      const dt = last.current === null ? 0 : Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      const s = sim.current;
      s.emit += dt;
      if (s.emit > 0.35) {
        s.emit = 0;
        const bits: number[] = [];
        const flipped: boolean[] = [];
        let ones = 0;
        for (let i = 0; i < n; i += 1) {
          const f = rand.current() < p;
          flipped.push(f);
          bits.push(f ? 1 : 0);
          if (f) ones += 1;
        }
        const decoded = ones > n / 2 ? 1 : 0; // sent word is all zeros
        s.words.push({ bits, flipped, x: 0, decoded, ok: decoded === 0 });
        s.sent += 1;
        if (decoded !== 0) s.wrong += 1;
      }
      for (const w of s.words) w.x += dt * 140;
      s.words = s.words.filter((w) => w.x < 330);
      if (canvas !== null) draw(canvas, p, n, s);
    },
    true,
    wrapRef,
  );

  const pl = repetitionLogicalError(p, n);
  return (
    <Figure
      n="F25"
      title="Redundancy without copying: the repetition code"
      caption={
        <>
          <strong>a</strong>, A stream of logical zeros, each encoded as n physical bits; every bit
          flips independently with probability p (red). Majority vote recovers the word unless
          more than half the bits flipped. <strong>b</strong>, Logical error versus p from the
          binomial sum P<sub>L</sub> = Σ<sub>k&gt;n/2</sub> C(n,k) p<sup>k</sup>(1−p)<sup>n−k</sup>.
          Every curve crosses the diagonal at p = ½: below it, more redundancy helps and the
          improvement is exponential in n; above it, redundancy hurts. That crossing is the
          simplest example of a <em>threshold</em>. For qubits the trick is subtler — cloning is
          forbidden and phase flips are errors too — but the same structure survives: the surface
          code below is a repetition code in two directions at once.
        </>
      }
    >
      <Panel tag="a" title={`n = ${n}: P_L = ${pl.toExponential(2)} at p = ${p.toFixed(2)}`} wide>
        <div ref={wrapRef}>
          <div className="mode-row">
            {NS.map((k) => (
              <button key={k} type="button" className={n === k ? 'active' : undefined} onClick={() => setN(k)}>
                n = {k}
              </button>
            ))}
          </div>
          <Slider label="Physical flip probability p" value={p} min={0.01} max={0.5} step={0.01} display={p.toFixed(2)} onChange={setP} />
          <canvas ref={canvasRef} className="sketch" />
        </div>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, p: number, n: number, s: Sim): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  // --- a: stream
  frame(ctx, 20, 20, 340, 290, `a  logical 0 → ${'0'.repeat(n)} , flips at p = ${p.toFixed(2)}`);
  const laneY = 60;
  const cell = n <= 3 ? 14 : n <= 5 ? 11 : 9;
  ctx.font = MONO;
  for (const w of s.words) {
    const x0 = 30 + w.x;
    const y0 = laneY + 40;
    if (x0 > 340) continue;
    w.bits.forEach((b, i) => {
      ctx.fillStyle = w.flipped[i] ? RED : '#2a2c30';
      ctx.fillRect(x0, y0 + i * (cell + 2), cell, cell);
      ctx.fillStyle = w.flipped[i] ? CREAM : MUTED;
      ctx.fillText(String(b), x0 + cell / 2 - 3, y0 + i * (cell + 2) + cell - 2);
    });
    ctx.fillStyle = w.ok ? GREEN : RED;
    ctx.fillText(w.ok ? '✓ 0' : '✗ 1', x0 - 4, y0 + n * (cell + 2) + 14);
  }
  ctx.fillStyle = MUTED;
  ctx.fillText('→ flight through noisy channel →', 30, laneY + 20);
  ctx.fillText('majority vote:', 30, laneY + 50 + n * (cell + 2) + 40);
  ctx.fillStyle = CREAM;
  ctx.fillText(
    `${s.sent} words · ${s.wrong} decoded wrong · observed P_L = ${s.sent > 0 ? (s.wrong / s.sent).toFixed(3) : '—'}`,
    30,
    laneY + 50 + n * (cell + 2) + 56,
  );
  ctx.fillStyle = MUTED;
  ctx.fillText(`exact P_L = ${repetitionLogicalError(p, n).toFixed(3)}`, 30, laneY + 50 + n * (cell + 2) + 72);

  // --- b: curves
  const px = 400;
  const py = 20;
  const pw = 240;
  const ph = 260;
  frame(ctx, px, py, pw, ph, 'b  P_L(p) for n = 1, 3, 5, 7');
  const xOf = (q: number) => px + 14 + (q / 0.5) * (pw - 28);
  const yOf = (q: number) => py + ph - 24 - (q / 0.5) * (ph - 50);
  ctx.strokeStyle = '#2a2c30';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(0));
  ctx.lineTo(xOf(0.5), yOf(0.5));
  ctx.stroke();
  ctx.setLineDash([]);
  const cols: Record<number, string> = { 1: MUTED, 3: BLUE, 5: AMBER, 7: GREEN };
  for (const k of NS) {
    ctx.strokeStyle = cols[k]!;
    ctx.lineWidth = k === n ? 2.2 : 1;
    ctx.beginPath();
    for (let i = 0; i <= 100; i += 1) {
      const q = (i / 100) * 0.5;
      const y = yOf(repetitionLogicalError(q, k));
      if (i === 0) ctx.moveTo(xOf(q), y);
      else ctx.lineTo(xOf(q), y);
    }
    ctx.stroke();
    ctx.fillStyle = cols[k]!;
    ctx.fillText(`n = ${k}`, px + 14, py + 58 + NS.indexOf(k) * 14);
  }
  ctx.lineWidth = 1;
  // current point
  const pl = repetitionLogicalError(p, n);
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(xOf(p), yOf(pl), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.fillText('0', xOf(0) - 3, py + ph - 8);
  ctx.fillText('p = 0.5', xOf(0.5) - 36, py + ph - 8);
  ctx.fillText('P_L', px + 4, yOf(0.5) + 12);
  ctx.fillText('P_L = p', xOf(0.16) - 50, yOf(0.16) - 6);
}
