import { useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { correlation, correlationMixed, KET00, marginalPlus, PHI_PLUS, type State } from '../../physics/twoqubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, lcg, MONO, MUTED, RED, SANS, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 340;
type Source = 'bell' | 'classical';
const KET11: State = [[0, 0], [0, 0], [0, 0], [1, 0]];
const MIX = [
  { w: 0.5, s: KET00 },
  { w: 0.5, s: KET11 },
];

type Tally = { same: number; diff: number; n: number };

export function CorrelationLab() {
  const [source, setSource] = useState<Source>('bell');
  const [aDeg, setADeg] = useState(0);
  const [bDeg, setBDeg] = useState(45);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tally = useRef<Tally>({ same: 0, diff: 0, n: 0 });
  const flight = useRef<{ x: number; a: 1 | -1; b: 1 | -1 }[]>([]);
  const rand = useRef(lcg(17));
  const lastRef = useRef<number | null>(null);
  const emitRef = useRef(0);
  const [, force] = useState(0);

  const a = (aDeg * Math.PI) / 180;
  const b = (bDeg * Math.PI) / 180;
  const E = source === 'bell' ? correlation(PHI_PLUS, a, b) : correlationMixed(MIX, a, b);

  const reset = (s: Source) => {
    setSource(s);
    tally.current = { same: 0, diff: 0, n: 0 };
    flight.current = [];
  };

  useRaf(
    (nowMs) => {
      const last = lastRef.current;
      lastRef.current = nowMs;
      const dt = last === null ? 0 : Math.min(0.05, (nowMs - last) / 1000);
      emitRef.current += dt;
      // emit a pair every 120 ms; sample joint outcomes from the model
      if (emitRef.current > 0.12 && tally.current.n < 600) {
        emitRef.current = 0;
        const r = rand.current;
        let st: State;
        if (source === 'bell') st = PHI_PLUS;
        else st = r() < 0.5 ? KET00 : KET11;
        const pA = marginalPlus(st, 0, a);
        const oa: 1 | -1 = r() < pA ? 1 : -1;
        // conditional P(b = +1 | a) from joint: P(++) = (1 + ⟨A⟩ + ⟨B⟩ + E)/4 etc.
        const eAB = correlation(st, a, b);
        const mB = 2 * marginalPlus(st, 1, b) - 1;
        const mA = 2 * pA - 1;
        const pJointPlus = (1 + mA * oa + mB + eAB * oa) / 4; // P(A = oa, B = +1)
        const pAo = (1 + mA * oa) / 2;
        const pBplusGiven = pAo > 0 ? pJointPlus / pAo : 0.5;
        const ob: 1 | -1 = r() < pBplusGiven ? 1 : -1;
        flight.current.push({ x: 0, a: oa, b: ob });
      }
      for (const f of flight.current) f.x += dt * 1.6;
      const arrived = flight.current.filter((f) => f.x >= 1);
      for (const f of arrived) {
        if (f.a === f.b) tally.current.same += 1;
        else tally.current.diff += 1;
        tally.current.n += 1;
      }
      if (arrived.length > 0) force((v) => v + 1);
      flight.current = flight.current.filter((f) => f.x < 1);
      const canvas = canvasRef.current;
      if (canvas === null) return;
      draw(canvas, source, a, b, E, tally.current, flight.current);
    },
    true,
    canvasRef,
  );

  const t = tally.current;
  const measuredE = t.n > 0 ? (t.same - t.diff) / t.n : 0;

  return (
    <Figure
      n="F21"
      title="Correlated is not the same as entangled"
      caption={
        <>
          A source emits pairs; each qubit flies to a station that measures it along an angle
          you choose (θ from the z axis, in the x–z plane) and reports ±1. The tally is the
          correlation E = ⟨A·B⟩ = P(same) − P(different). <em>Classical source:</em> each pair is
          either |00⟩ or |11⟩, decided at emission — perfectly correlated along z, but the
          correlation dies as cos θ<sub>A</sub> cos θ<sub>B</sub> when the stations tilt, because each
          qubit carries a definite z-value and nothing else. <em>Bell source:</em> the pair is
          (|00⟩ + |11⟩)/√2 — the same z statistics, but E = cos(θ<sub>A</sub> − θ<sub>B</sub>): the
          qubits agree perfectly along <em>any</em> common axis, which no pre-assigned values can
          reproduce. The curve at right shows both models versus the angle difference.
        </>
      }
    >
      <Panel tag="a" title={source === 'bell' ? 'Bell pair (|00⟩ + |11⟩)/√2' : 'classical mixture: |00⟩ or |11⟩'} wide>
        <div className="mode-row">
          <button type="button" className={source === 'bell' ? 'active' : undefined} onClick={() => reset('bell')}>
            Bell source
          </button>
          <button type="button" className={source === 'classical' ? 'active' : undefined} onClick={() => reset('classical')}>
            classical source
          </button>
        </div>
        <div className="slider-pair">
          <Slider label="Station A angle θ_A" value={aDeg} min={-90} max={90} step={1} unit="°" onChange={setADeg} />
          <Slider label="Station B angle θ_B" value={bDeg} min={-90} max={90} step={1} unit="°" onChange={setBDeg} />
        </div>
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          predicted E = {E.toFixed(3)} · measured {t.n > 0 ? measuredE.toFixed(3) : '—'} from {t.n} pairs ·{' '}
          {source === 'bell' ? 'E = cos(θ_A − θ_B)' : 'E = cos θ_A · cos θ_B'}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, source: Source, a: number, b: number, E: number, t: Tally, flight: readonly { x: number; a: 1 | -1; b: 1 | -1 }[]): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  // --- stations
  const cy = 120;
  const sx = 200;
  const xa = 60;
  const xb = 340;
  ctx.fillStyle = source === 'bell' ? VIOLET : AMBER;
  ctx.beginPath();
  ctx.arc(sx, cy, 10, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('source', sx - 20, cy + 28);
  const station = (x: number, theta: number, label: string) => {
    ctx.strokeStyle = '#3a3c40';
    ctx.strokeRect(x - 26, cy - 26, 52, 52);
    // dial
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 20 * Math.sin(theta), cy + 20 * Math.cos(theta));
    ctx.lineTo(x + 20 * Math.sin(theta), cy - 20 * Math.cos(theta));
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = CREAM;
    ctx.font = SANS;
    ctx.fillText(label, x - 8, cy - 34);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText(`θ = ${((theta * 180) / Math.PI).toFixed(0)}°`, x - 22, cy + 42);
  };
  station(xa, a, 'A');
  station(xb, b, 'B');
  // flying pairs
  for (const f of flight) {
    const pa = sx - (sx - xa - 26) * f.x;
    const pb = sx + (xb - 26 - sx) * f.x;
    ctx.fillStyle = f.a > 0 ? BLUE : RED;
    ctx.beginPath();
    ctx.arc(pa, cy, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = f.b > 0 ? BLUE : RED;
    ctx.beginPath();
    ctx.arc(pb, cy, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('blue: +1   red: −1', xa - 26, cy + 70);
  // tallies
  const total = Math.max(1, t.n);
  frame(ctx, 40, 220, 330, 112, 'outcomes');
  const bx = 60;
  const by = 250;
  const bw = 120;
  const bh = 40;
  ctx.fillStyle = '#1b1c1f';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillRect(bx + 160, by, bw, bh);
  ctx.fillStyle = BLUE;
  ctx.fillRect(bx, by, (t.same / total) * bw, bh);
  ctx.fillStyle = RED;
  ctx.fillRect(bx + 160, by, (t.diff / total) * bw, bh);
  ctx.fillStyle = CREAM;
  ctx.fillText(`same: ${t.same}`, bx, by + bh + 16);
  ctx.fillText(`different: ${t.diff}`, bx + 160, by + bh + 16);
  ctx.fillStyle = MUTED;
  ctx.fillText(`E = (same − different)/n = ${t.n > 0 ? ((t.same - t.diff) / t.n).toFixed(2) : '—'}`, bx, by + bh + 32);

  // --- correlation curve vs angle difference (with θ_A fixed)
  const px = 400;
  const py = 24;
  const pw = 240;
  const ph = 280;
  frame(ctx, px, py, pw, ph, 'E vs θ_B  (θ_A fixed)');
  const xOf = (deg: number) => px + ((deg + 90) / 180) * pw;
  const yOf = (e: number) => py + ph / 2 - e * (ph / 2 - 20);
  ctx.strokeStyle = '#1d1e20';
  ctx.beginPath();
  ctx.moveTo(px, yOf(0));
  ctx.lineTo(px + pw, yOf(0));
  ctx.stroke();
  const curve = (f: (thB: number) => number, col: string, width: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 180; i += 1) {
      const deg = -90 + i;
      const y = yOf(f((deg * Math.PI) / 180));
      if (i === 0) ctx.moveTo(xOf(deg), y);
      else ctx.lineTo(xOf(deg), y);
    }
    ctx.stroke();
  };
  curve((thB) => correlation(PHI_PLUS, a, thB), source === 'bell' ? VIOLET : 'rgba(176,138,214,0.3)', source === 'bell' ? 2 : 1);
  curve((thB) => correlationMixed(MIX, a, thB), source === 'classical' ? AMBER : 'rgba(212,162,74,0.3)', source === 'classical' ? 2 : 1);
  ctx.fillStyle = VIOLET;
  ctx.font = MONO;
  ctx.fillText('Bell: cos(θ_A−θ_B)', px + 8, py + ph - 20);
  ctx.fillStyle = AMBER;
  ctx.fillText('classical: cosθ_A cosθ_B', px + 8, py + ph - 6);
  ctx.fillStyle = MUTED;
  ctx.fillText('−90°', px, py + ph + 14);
  ctx.fillText('+90°', px + pw - 30, py + ph + 14);
  ctx.fillText('+1', px - 18, yOf(1) + 4);
  ctx.fillText('−1', px - 18, yOf(-1) + 4);
  // marker: predicted + measured
  ctx.strokeStyle = RED;
  ctx.beginPath();
  ctx.moveTo(xOf((b * 180) / Math.PI), py);
  ctx.lineTo(xOf((b * 180) / Math.PI), py + ph);
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(xOf((b * 180) / Math.PI), yOf(E), 4, 0, 2 * Math.PI);
  ctx.fill();
  if (t.n > 0) {
    const m = (t.same - t.diff) / t.n;
    ctx.strokeStyle = CREAM;
    ctx.beginPath();
    ctx.arc(xOf((b * 180) / Math.PI), yOf(m), 7, 0, 2 * Math.PI);
    ctx.stroke();
  }
}
