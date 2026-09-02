import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { ramseyP1, type Vec3 } from '../../physics/qubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, drawSphere, drawTrail, drawVector, frame, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;

export function RamseyFringes() {
  const [step, setStep] = useState(0);
  const [tFree, setTFree] = useState(1); // ms
  const [deltaHz, setDeltaHz] = useState(250); // Hz
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, step, tFree * 1e-3, deltaHz);
  }, [step, tFree, deltaHz]);

  const phase = 2 * Math.PI * deltaHz * tFree * 1e-3; // rad
  const p1 = ramseyP1(2 * Math.PI * deltaHz, tFree * 1e-3);

  const steps: readonly StepDef[] = [
    {
      label: 'π/2: open the clock',
      text: (
        <>
          Start in |0⟩ and apply a resonant pulse of half the flip length — a π/2 pulse. The
          vector lands on the equator: an equal superposition with a definite phase. From now on
          the qubit is a stopwatch: its phase advances at the qubit&rsquo;s own frequency.
        </>
      ),
    },
    {
      label: 'wait T',
      text: (
        <>
          Do nothing for a time T. In a frame rotating at the drive frequency, the vector turns
          through an angle φ = 2π δ T, where δ is the difference between the atom&rsquo;s
          frequency and the drive&rsquo;s. If they agree exactly, it does not move. This is the
          step where the qubit is sensitive to everything — magnetic fields, light shifts — and
          the step that error correction has to protect.
        </>
      ),
    },
    {
      label: 'π/2: read the phase',
      text: (
        <>
          A second π/2 pulse converts the invisible phase into visible population: P(1) =
          cos²(φ/2). Sweep δ and the population oscillates — Ramsey fringes — with a period 1/T.
          The longer you wait, the finer the fringes, so a long T measures frequency precisely.
          That is how atomic clocks work, and it is also why a qubit that has lost its phase
          (φ random) gives a flat 50/50: no fringes, no information.
        </>
      ),
    },
  ];

  return (
    <>
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="F8"
        title="Ramsey interferometry: turning phase into population"
        caption={
          <>
            The three-stage sequence π/2 – T – π/2 in the rotating frame. After the first pulse the
            Bloch vector lies on the equator; during T it precesses by φ = 2π δ T; the second pulse
            maps that angle onto the poles, P(1) = cos²(φ/2). Right: P(1) versus detuning δ for the
            chosen T — fringes of period 1/T. The clock-state dephasing figure on the rubidium page
            is this experiment run on many atoms whose δ differ.
          </>
        }
      >
        <Panel tag="a" title="Sequence on the sphere; fringes in δ" wide>
          <div className="slider-pair">
            <Slider label="Free-evolution time T" value={tFree} min={0.1} max={5} step={0.1} unit="ms" display={tFree.toFixed(1)} onChange={setTFree} />
            <Slider label="Detuning δ" value={deltaHz} min={-1000} max={1000} step={10} unit="Hz" onChange={setDeltaHz} />
          </div>
          <canvas ref={canvasRef} className="sketch" />
          <p className="board-cap">
            φ = 2π δ T = {phase.toFixed(2)} rad = {((phase * 180) / Math.PI).toFixed(0)}° · P(1) = cos²(φ/2) = {p1.toFixed(3)} · fringe period 1/T ={' '}
            {(1000 / tFree).toFixed(0)} Hz
          </p>
        </Panel>
      </Figure>
    </>
  );
}

function draw(canvas: HTMLCanvasElement, step: number, tFree: number, deltaHz: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const cx = 160;
  const cy = 160;
  const R = 112;
  drawSphere(ctx, cx, cy, R);
  const phi = 2 * Math.PI * deltaHz * tFree;
  // π/2 about x sends +z to −y; free precession about z turns (0,−1,0) into (sin φ, −cos φ, 0);
  // the second π/2 about x maps y → z, giving z = −cos φ and hence P(1) = cos²(φ/2).
  const afterFirst: Vec3 = [0, -1, 0];
  const afterWait: Vec3 = [Math.sin(phi), -Math.cos(phi), 0];
  const afterSecond: Vec3 = [afterWait[0], 0, afterWait[1]];
  // trails
  const t1: Vec3[] = [];
  for (let i = 0; i <= 30; i += 1) {
    const a = (i / 30) * (Math.PI / 2);
    t1.push([0, -Math.sin(a), Math.cos(a)]);
  }
  drawTrail(ctx, cx, cy, R, t1, 'rgba(110,168,212,0.7)');
  if (step >= 1) {
    const t2: Vec3[] = [];
    for (let i = 0; i <= 60; i += 1) {
      const a = (i / 60) * phi;
      t2.push([Math.sin(a), -Math.cos(a), 0]);
    }
    drawTrail(ctx, cx, cy, R, t2, 'rgba(212,162,74,0.8)');
  }
  if (step >= 2) {
    const t3: Vec3[] = [];
    for (let i = 0; i <= 30; i += 1) {
      const a = (i / 30) * (Math.PI / 2);
      t3.push([afterWait[0], afterWait[1] * Math.cos(a), afterWait[1] * Math.sin(a)]);
    }
    drawTrail(ctx, cx, cy, R, t3, 'rgba(110,168,212,0.7)');
  }
  const v = step === 0 ? afterFirst : step === 1 ? afterWait : afterSecond;
  drawVector(ctx, cx, cy, R, v, VIOLET, 2.4, 5);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(step === 0 ? 'after π/2: on the equator' : step === 1 ? `after T: turned by φ = ${((phi * 180) / Math.PI).toFixed(0)}°` : `after second π/2: P(1) = ${ramseyP1(2 * Math.PI * deltaHz, tFree).toFixed(2)}`, 20, H - 14);

  // sequence sketch
  const sx = 320;
  const sy = 26;
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  const stages = ['π/2', `T = ${(tFree * 1e3).toFixed(1)} ms`, 'π/2', 'measure'];
  let x = sx;
  stages.forEach((s, i) => {
    const w = i === 1 ? 120 : 60;
    ctx.strokeStyle = i === step || (i === 3 && step === 2) ? CREAM : '#3a3c40';
    ctx.strokeRect(x, sy, w, 22);
    ctx.fillStyle = i === step ? CREAM : MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(s, x + w / 2, sy + 15);
    ctx.textAlign = 'left';
    x += w + 6;
  });

  // fringes
  const px = 320;
  const py = 70;
  const pw = 320;
  const ph = 190;
  frame(ctx, px, py, pw, ph, 'P(1) vs detuning δ');
  ctx.fillStyle = MUTED;
  ctx.fillText('1', px - 10, py + 8);
  ctx.fillText('0', px - 10, py + ph + 4);
  ctx.fillText('−1 kHz', px - 4, py + ph + 16);
  ctx.fillText('0', px + pw / 2 - 3, py + ph + 16);
  ctx.fillText('+1 kHz', px + pw - 40, py + ph + 16);
  ctx.strokeStyle = step >= 2 ? AMBER : 'rgba(212,162,74,0.25)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i <= 400; i += 1) {
    const d = -1000 + (i / 400) * 2000;
    const y = py + ph - ramseyP1(2 * Math.PI * d, tFree) * ph;
    if (i === 0) ctx.moveTo(px + (i / 400) * pw, y);
    else ctx.lineTo(px + (i / 400) * pw, y);
  }
  ctx.stroke();
  const mx = px + ((deltaHz + 1000) / 2000) * pw;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mx, py);
  ctx.lineTo(mx, py + ph);
  ctx.stroke();
  if (step >= 2) {
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(mx, py + ph - ramseyP1(2 * Math.PI * deltaHz, tFree) * ph, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = BLUE;
  ctx.fillText(`fringe period 1/T = ${(1 / tFree).toFixed(0)} Hz`, px + 6, py + ph - 6);
}
