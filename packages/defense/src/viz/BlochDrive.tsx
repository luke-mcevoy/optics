import { useRef, useState } from 'react';
import { Figure, Panel } from '../components/Figure.tsx';
import { PAPER } from '../data/paper.ts';
import { clear, sizeCanvas } from './canvas.ts';
import { useRaf } from './useRaf.ts';

const W = 660;
const H = 300;
const F_RABI_MHZ = PAPER.raman.globalRabiMHz; // cyclic frequency
const OMEGA = 2 * Math.PI * F_RABI_MHZ * 1e6; // rad/s
/** Wall-clock slowdown: 1 μs of atom time takes ~0.8 s on screen. */
const SLOWDOWN = 8e5;

export function BlochDrive() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const thetaRef = useRef(0); // accumulated pulse area, rad
  const targetRef = useRef(0);
  const lastMsRef = useRef<number | null>(null);
  const [, setTick] = useState(0); // re-render readouts a few times per second

  const firePulse = (area: number) => {
    targetRef.current = thetaRef.current + area;
    lastMsRef.current = null;
  };

  const reset = () => {
    thetaRef.current = 0;
    targetRef.current = 0;
    lastMsRef.current = null;
    setTick((v) => v + 1);
  };

  useRaf((nowMs) => {
    const last = lastMsRef.current;
    lastMsRef.current = nowMs;
    if (last !== null && thetaRef.current < targetRef.current) {
      const dtWall = Math.min(0.05, (nowMs - last) / 1000);
      thetaRef.current = Math.min(
        targetRef.current,
        thetaRef.current + (OMEGA * dtWall) / SLOWDOWN,
      );
      setTick((v) => v + 1);
    }
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, thetaRef.current);
  });

  const theta = thetaRef.current;
  const tUs = (theta / OMEGA) * 1e6;
  const p1 = Math.sin(theta / 2) ** 2;

  return (
    <Figure
      n="2"
      title="A gate is a rotation you can watch"
      caption={
        <>
          <strong>a</strong>, The qubit state on the Bloch sphere. |0⟩ is the north pole, |1⟩ the
          south. A resonant Raman drive rotates the state about an equatorial axis at the Rabi
          frequency; the buttons fire pulses of fixed area. With the paper&rsquo;s global Rabi
          frequency f<sub>R</sub> = {F_RABI_MHZ} MHz, a π pulse (|0⟩ → |1⟩) takes
          1/(2f<sub>R</sub>) = {(1 / (2 * F_RABI_MHZ)).toFixed(1)} μs; the animation is slowed
          about {Math.round(SLOWDOWN / 1000)},000×. <strong>b</strong>, The measurable
          consequence: P(|1⟩) = sin²(θ/2) versus accumulated pulse area θ — the Rabi oscillation.
          Cutting the same drive short at θ = π/2 leaves the state on the equator: an equal
          superposition, the first half of every Ramsey sequence.
        </>
      }
    >
      <Panel tag="a" title="Bloch sphere under a resonant Raman drive" wide>
        <div className="mode-row">
          <button type="button" onClick={() => firePulse(Math.PI / 2)}>
            π/2 pulse
          </button>
          <button type="button" onClick={() => firePulse(Math.PI)}>
            π pulse
          </button>
          <button type="button" onClick={() => firePulse(2 * Math.PI)}>
            2π pulse
          </button>
          <button type="button" onClick={reset}>
            reset to |0⟩
          </button>
        </div>
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          θ = {(theta / Math.PI).toFixed(2)}π &nbsp;·&nbsp; t = {tUs.toFixed(2)} μs of drive
          &nbsp;·&nbsp; P(|1⟩) = {p1.toFixed(3)}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, theta: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const mono = '11px IBM Plex Mono, monospace';

  // --- Bloch sphere (rotation about the y axis: trajectory in the x–z plane) ---
  const cx = 165;
  const cy = 152;
  const R = 105;

  ctx.strokeStyle = '#2a2b2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * 0.3, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - R - 8);
  ctx.lineTo(cx, cy + R + 8);
  ctx.stroke();

  ctx.fillStyle = '#9b9790';
  ctx.font = mono;
  ctx.fillText('|0⟩', cx + 6, cy - R - 2);
  ctx.fillText('|1⟩', cx + 6, cy + R + 12);
  ctx.fillText('drive axis ⊙ (into page)', cx - 62, cy + R + 30);

  // trail
  const steps = 90;
  for (let i = 0; i < steps; i += 1) {
    const th = Math.max(0, theta - (steps - i) * 0.02);
    const x = cx + Math.sin(th) * R;
    const y = cy - Math.cos(th) * R;
    ctx.fillStyle = `rgba(110, 168, 212, ${0.05 + (0.3 * i) / steps})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, 2 * Math.PI);
    ctx.fill();
  }

  // state vector
  const sx = cx + Math.sin(theta) * R;
  const sy = cy - Math.cos(theta) * R;
  ctx.strokeStyle = '#b08ad6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.fillStyle = '#b08ad6';
  ctx.beginPath();
  ctx.arc(sx, sy, 4.5, 0, 2 * Math.PI);
  ctx.fill();

  // --- P(|1⟩) vs pulse area ---
  const px = 330;
  const py = 34;
  const pw = 300;
  const ph = 216;
  const maxArea = 4 * Math.PI;

  ctx.strokeStyle = '#2a2b2e';
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = '#9b9790';
  ctx.font = mono;
  ctx.fillText('P(|1⟩) = sin²(θ/2)', px + 4, py - 8);
  ctx.fillText('0', px - 10, py + ph + 4);
  ctx.fillText('1', px - 10, py + 8);
  for (let k = 1; k <= 4; k += 1) {
    const x = px + (k * Math.PI * pw) / maxArea;
    ctx.strokeStyle = '#1d1e20';
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x, py + ph);
    ctx.stroke();
    ctx.fillText(`${k}π`, x - 8, py + ph + 16);
  }

  ctx.strokeStyle = '#6ea8d4';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i <= 240; i += 1) {
    const a = (i / 240) * maxArea;
    const x = px + (a / maxArea) * pw;
    const y = py + ph - Math.sin(a / 2) ** 2 * ph;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const thClamped = Math.min(theta, maxArea);
  const mx = px + (thClamped / maxArea) * pw;
  const my = py + ph - Math.sin(thClamped / 2) ** 2 * ph;
  ctx.strokeStyle = '#c81e1e';
  ctx.beginPath();
  ctx.moveTo(mx, py);
  ctx.lineTo(mx, py + ph);
  ctx.stroke();
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.arc(mx, my, 4, 0, 2 * Math.PI);
  ctx.fill();
}
