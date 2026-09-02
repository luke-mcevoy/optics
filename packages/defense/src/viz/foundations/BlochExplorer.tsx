import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { PAPER } from '../../data/paper.ts';
import { blochFromAngles, p1FromTheta } from '../../physics/qubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, bars, CREAM, drawSphere, drawVector, frame, lcg, MONO, MUTED, SANS, toScreen, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;
const STEP_ANGLES: readonly (readonly [number, number] | null)[] = [
  [0, 0],
  [Math.PI / 2, 0],
  [Math.PI / 2, Math.PI / 2],
  null,
];

export function BlochExplorer() {
  const [step, setStep] = useState(0);
  const [thetaDeg, setThetaDeg] = useState(0);
  const [phiDeg, setPhiDeg] = useState(0);
  const [shots, setShots] = useState<{ n0: number; n1: number }>({ n0: 0, n1: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rand = useRef(lcg(7));

  const theta = (thetaDeg * Math.PI) / 180;
  const phi = (phiDeg * Math.PI) / 180;
  const p1 = p1FromTheta(theta);
  const alpha = Math.cos(theta / 2);
  const beta = Math.sin(theta / 2);

  useEffect(() => {
    const a = STEP_ANGLES[step];
    if (a) {
      setThetaDeg(Math.round((a[0] * 180) / Math.PI));
      setPhiDeg(Math.round((a[1] * 180) / Math.PI));
    } else {
      setThetaDeg(60);
      setPhiDeg(30);
    }
    setShots({ n0: 0, n1: 0 });
  }, [step]);

  useEffect(() => {
    setShots({ n0: 0, n1: 0 });
  }, [thetaDeg, phiDeg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, theta, phi, shots, step);
  }, [theta, phi, shots, step]);

  const measure = (n: number) => {
    let n0 = shots.n0;
    let n1 = shots.n1;
    for (let i = 0; i < n; i += 1) {
      if (rand.current() < p1) n1 += 1;
      else n0 += 1;
    }
    setShots({ n0, n1 });
  };

  const steps: readonly StepDef[] = [
    {
      label: 'two poles',
      text: (
        <>
          A qubit is any physical system with two energy levels you can isolate — here they will
          be two hyperfine levels of a rubidium atom, {PAPER.qubit.hyperfineGHz} GHz apart. Call
          the lower one |0⟩ and the upper |1⟩ and draw them as the north and south poles of a
          sphere. A classical bit lives only at the poles.
        </>
      ),
    },
    {
      label: 'superposition',
      text: (
        <>
          The qubit can also be anywhere on the surface: α|0⟩ + β|1⟩ with |α|² + |β|² = 1. The
          latitude θ sets the weights — on the equator, α = β = 1/√2, so a measurement gives
          |0⟩ or |1⟩ with equal odds. Drag θ. The sphere is not a picture of the atom; it is a
          picture of the state, and every point on it is a legitimate, distinct state.
        </>
      ),
    },
    {
      label: 'phase',
      text: (
        <>
          The longitude φ is the <em>relative phase</em> between α and β. It changes nothing about
          the odds of |0⟩ versus |1⟩ — every point on the equator gives 50/50 — yet it is a real,
          physical degree of freedom: it decides how the state responds to the next pulse and it
          is what interference and every quantum algorithm actually manipulate. It is also what
          decoherence destroys first.
        </>
      ),
    },
    {
      label: 'measurement',
      text: (
        <>
          Look at the atom and you never see the in-between. The state jumps to |0⟩ or |1⟩, with
          probabilities |α|² = cos²(θ/2) and |β|² = sin²(θ/2), and the phase is gone. Press
          &ldquo;measure&rdquo; and watch the tallies converge to the predicted fractions — this
          is the only way information ever leaves a qubit, and it is why a computation must be
          finished before you look.
        </>
      ),
    },
  ];

  return (
    <>
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="F5"
        title="The Bloch sphere: one qubit’s state as a direction"
        caption={
          <>
            The pure state cos(θ/2)|0⟩ + e<sup>iφ</sup> sin(θ/2)|1⟩ drawn as a unit vector. θ is
            measured from |0⟩ at the north pole; φ is the relative phase, invisible to a
            measurement in the 0/1 basis. Right: predicted P(0) = cos²(θ/2), P(1) = sin²(θ/2) and
            the tally of simulated measurements, each an independent draw with those odds. In the
            machine, |0⟩ and |1⟩ are the two m<sub>F</sub> = 0 hyperfine levels of ⁸⁷Rb (see{' '}
            <a href="#/foundations/rubidium-atom">Inside the rubidium atom</a>).
          </>
        }
      >
        <Panel tag="a" title="State on the sphere" wide>
          <div className="slider-pair">
            <Slider label="θ (latitude from |0⟩)" value={thetaDeg} min={0} max={180} step={1} unit="°" onChange={setThetaDeg} />
            <Slider label="φ (relative phase)" value={phiDeg} min={0} max={360} step={1} unit="°" onChange={setPhiDeg} />
          </div>
          <canvas ref={canvasRef} className="sketch" />
          <div className="mode-row">
            <button type="button" onClick={() => measure(1)}>
              measure once
            </button>
            <button type="button" onClick={() => measure(20)}>
              measure ×20
            </button>
            <button type="button" onClick={() => measure(200)}>
              measure ×200
            </button>
            <button type="button" onClick={() => setShots({ n0: 0, n1: 0 })}>
              clear
            </button>
          </div>
          <p className="board-cap">
            α = {alpha.toFixed(3)} · β = {beta.toFixed(3)} e<sup>i{phiDeg}°</sup> · P(1) = {p1.toFixed(3)} ·{' '}
            {shots.n0 + shots.n1} shots
            {shots.n0 + shots.n1 > 0 ? ` → measured P(1) = ${(shots.n1 / (shots.n0 + shots.n1)).toFixed(3)}` : ''}
          </p>
        </Panel>
      </Figure>
    </>
  );
}

function draw(canvas: HTMLCanvasElement, theta: number, phi: number, shots: { n0: number; n1: number }, step: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const cx = 170;
  const cy = 160;
  const R = 118;
  drawSphere(ctx, cx, cy, R);
  const v = blochFromAngles(theta, phi);
  // latitude circle
  if (step >= 1) {
    ctx.strokeStyle = 'rgba(110,168,212,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 72; i += 1) {
      const a = (i / 72) * 2 * Math.PI;
      const p = blochFromAngles(theta, a);
      const q = toScreen(p, cx, cy, R);
      if (i === 0) ctx.moveTo(q[0], q[1]);
      else ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
  }
  drawVector(ctx, cx, cy, R, v, VIOLET, 2.4, 5);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(`θ = ${((theta * 180) / Math.PI).toFixed(0)}°  φ = ${((phi * 180) / Math.PI).toFixed(0)}°`, 20, H - 14);

  // right: state readout + probabilities
  const px = 340;
  ctx.fillStyle = CREAM;
  ctx.font = SANS;
  ctx.fillText('|ψ⟩ = α|0⟩ + β|1⟩', px, 34);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(`α = cos(θ/2) = ${Math.cos(theta / 2).toFixed(3)}`, px, 54);
  ctx.fillText(`β = e^iφ sin(θ/2) = ${Math.sin(theta / 2).toFixed(3)} ∠${((phi * 180) / Math.PI).toFixed(0)}°`, px, 70);

  frame(ctx, px, 90, 280, 190, step >= 3 ? 'predicted (solid) vs measured (hatched)' : 'predicted probabilities');
  const p1 = p1FromTheta(theta);
  const total = shots.n0 + shots.n1;
  bars(ctx, px + 30, 120, 220, 120, [
    { label: '|0⟩', frac: 1 - p1, color: BLUE, note: `${((1 - p1) * 100).toFixed(1)}%` },
    { label: '|1⟩', frac: p1, color: AMBER, note: `${(p1 * 100).toFixed(1)}%` },
  ]);
  if (total > 0) {
    const bw = (220 - 10) / 2;
    const fr = [shots.n0 / total, shots.n1 / total];
    fr.forEach((f, i) => {
      const bx = px + 30 + i * (bw + 10);
      const y = 120 + 120 - f * 120;
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + bw, y);
      ctx.stroke();
      ctx.fillStyle = CREAM;
      ctx.font = MONO;
      ctx.textAlign = 'center';
      ctx.fillText(`${i === 0 ? shots.n0 : shots.n1}`, bx + bw / 2, y - 4);
      ctx.textAlign = 'left';
    });
  }
}
