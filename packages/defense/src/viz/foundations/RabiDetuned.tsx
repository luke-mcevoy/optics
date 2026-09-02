import { useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { drivenBloch, generalisedRabi, rabiP1, type Vec3 } from '../../physics/qubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, drawSphere, drawTrail, drawVector, frame, MONO, MUTED, RED, toScreen, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;
const T_MAX = 4 * Math.PI; // in units of 1/Ω
const SWEEP_S = 7;

export function RabiDetuned() {
  const [ratio, setRatio] = useState(0); // Δ/Ω
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useRaf(
    (nowMs) => {
      const last = lastRef.current;
      lastRef.current = nowMs;
      if (last !== null) tRef.current = (tRef.current + (Math.min(0.05, (nowMs - last) / 1000) / SWEEP_S) * T_MAX) % T_MAX;
      const canvas = canvasRef.current;
      if (canvas === null) return;
      draw(canvas, ratio, tRef.current);
    },
    true,
    canvasRef,
  );

  const om = 1;
  const de = ratio;
  const op = generalisedRabi(om, de);
  const peak = (om * om) / (op * op);
  const fR = PAPER.raman.globalRabiMHz;

  return (
    <Figure
      n="F7"
      title="Driving a qubit: Rabi oscillation and what detuning does"
      caption={
        <>
          A field oscillating near the qubit frequency rotates the Bloch vector. On resonance the
          rotation axis lies in the equator and |0⟩ is carried all the way to |1⟩: P(1) =
          sin²(Ωt/2), the Rabi oscillation, at the Rabi frequency Ω set by the field strength. A
          detuning Δ = ω − ω<sub>0</sub> tilts the axis out of the equator by
          tan<sup>−1</sup>(Δ/Ω) and speeds the rotation up to Ω′ = √(Ω² + Δ²), so the vector
          circles a cone and never reaches the far pole: P(1) = (Ω²/Ω′²) sin²(Ω′t/2), peak
          Ω²/(Ω² + Δ²). Resonance is therefore not a nicety but the condition for a complete
          flip. Paper values: global Raman Rabi frequency {fR} MHz, so a π pulse lasts{' '}
          {(1000 / (2 * fR)).toFixed(0)} ns of drive (composite pulses of ~{PAPER.raman.compositeUs} μs
          are used to make the result insensitive to small Δ and Ω errors).
        </>
      }
    >
      <Panel tag="a" title="Rotation axis and trajectory" wide>
        <Slider label="Detuning Δ / Ω" value={ratio} min={-3} max={3} step={0.05} display={ratio.toFixed(2)} onChange={setRatio} />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          Ω′ = {op.toFixed(2)} Ω · axis tilt {((Math.atan2(de, om) * 180) / Math.PI).toFixed(0)}° from the equator · peak P(1) ={' '}
          {peak.toFixed(3)}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, ratio: number, t: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const om = 1;
  const de = ratio;
  const cx = 160;
  const cy = 160;
  const R = 115;
  drawSphere(ctx, cx, cy, R);
  const op = generalisedRabi(om, de);
  const axis: Vec3 = [om / op, 0, de / op];
  // axis line
  const a = toScreen(axis, cx, cy, R);
  const b = toScreen([-axis[0], -axis[1], -axis[2]], cx, cy, R);
  ctx.strokeStyle = BLUE;
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(a[0] + (a[0] - cx) * 0.2, a[1] + (a[1] - cy) * 0.2);
  ctx.lineTo(b[0] + (b[0] - cx) * 0.2, b[1] + (b[1] - cy) * 0.2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = BLUE;
  ctx.font = MONO;
  ctx.fillText('rotation axis', a[0] + (a[0] - cx) * 0.3 - 20, a[1] + (a[1] - cy) * 0.3 - 6);
  // trail (full orbit) and current vector
  const pts: Vec3[] = [];
  for (let i = 0; i <= 160; i += 1) pts.push(drivenBloch(om, de, (i / 160) * ((2 * Math.PI) / op)));
  drawTrail(ctx, cx, cy, R, pts, 'rgba(176,138,214,0.45)');
  drawVector(ctx, cx, cy, R, drivenBloch(om, de, t), VIOLET, 2.4, 5);
  drawVector(ctx, cx, cy, R, [0, 0, 1], 'rgba(232,228,220,0.25)', 1, 2.5);

  // plot
  const px = 320;
  const py = 30;
  const pw = 320;
  const ph = 220;
  frame(ctx, px, py, pw, ph, 'P(1) vs time');
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('1', px - 10, py + 8);
  ctx.fillText('0', px - 10, py + ph + 4);
  for (let k = 1; k <= 4; k += 1) {
    const x = px + ((k * Math.PI) / T_MAX) * pw;
    ctx.strokeStyle = '#1d1e20';
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x, py + ph);
    ctx.stroke();
    ctx.fillText(`${k}π/Ω`, x - 14, py + ph + 16);
  }
  // resonant reference
  ctx.strokeStyle = 'rgba(232,228,220,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 300; i += 1) {
    const tt = (i / 300) * T_MAX;
    const y = py + ph - rabiP1(om, 0, tt) * ph;
    if (i === 0) ctx.moveTo(px + (tt / T_MAX) * pw, y);
    else ctx.lineTo(px + (tt / T_MAX) * pw, y);
  }
  ctx.stroke();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i <= 400; i += 1) {
    const tt = (i / 400) * T_MAX;
    const y = py + ph - rabiP1(om, de, tt) * ph;
    if (i === 0) ctx.moveTo(px + (tt / T_MAX) * pw, y);
    else ctx.lineTo(px + (tt / T_MAX) * pw, y);
  }
  ctx.stroke();
  // peak line
  const peak = (om * om) / (op * op);
  ctx.strokeStyle = 'rgba(212,162,74,0.4)';
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(px, py + ph - peak * ph);
  ctx.lineTo(px + pw, py + ph - peak * ph);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = AMBER;
  ctx.fillText(`peak Ω²/(Ω²+Δ²) = ${peak.toFixed(2)}`, px + pw - 170, py + ph - peak * ph + (peak > 0.9 ? 16 : -6));
  // marker
  const mx = px + (t / T_MAX) * pw;
  ctx.strokeStyle = RED;
  ctx.beginPath();
  ctx.moveTo(mx, py);
  ctx.lineTo(mx, py + ph);
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(mx, py + ph - rabiP1(om, de, t) * ph, 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.fillText('grey: resonant reference', px + 6, py + ph + 34);
}
