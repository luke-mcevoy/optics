import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { PAPER } from '../../data/paper.ts';
import { apply1, cz, H_GATE, KET00, probabilities, purityOf, reducedBloch, type State } from '../../physics/twoqubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, drawSphere, drawVector, frame, MONO, MUTED, SANS, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;

type Stage = { label: string; gate: string; state: State };

function buildStages(): Stage[] {
  const s0 = KET00;
  const s1 = apply1(s0, H_GATE, 0);
  const s2 = apply1(s1, H_GATE, 1);
  const s3 = cz(s2);
  const s4 = apply1(s3, H_GATE, 1);
  return [
    { label: '|00⟩', gate: 'start', state: s0 },
    { label: 'H on A', gate: 'H⊗I', state: s1 },
    { label: 'H on B', gate: 'I⊗H', state: s2 },
    { label: 'CZ', gate: 'CZ', state: s3 },
    { label: 'H on B', gate: 'I⊗H', state: s4 },
  ];
}

const STAGES = buildStages();

export function GateCircuit() {
  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, step);
  }, [step]);

  const steps: readonly StepDef[] = [
    {
      label: 'two qubits, both |0⟩',
      text: (
        <>
          Two qubits have four basis states — |00⟩, |01⟩, |10⟩, |11⟩ — and a general state is a
          list of four complex amplitudes whose squared magnitudes sum to one. Start with both in
          |0⟩. Each qubit&rsquo;s own Bloch vector (right) is a full-length arrow: knowing the
          pair, you know each one.
        </>
      ),
    },
    {
      label: 'H on A',
      text: (
        <>
          A Hadamard puts qubit A on the equator: (|0⟩ + |1⟩)/√2. The pair is now
          (|00⟩ + |10⟩)/√2 — still a <em>product</em>: A&rsquo;s state times B&rsquo;s state. Both
          arrows remain full length.
        </>
      ),
    },
    {
      label: 'H on B',
      text: (
        <>
          Now both qubits are on the equator and all four amplitudes are equal: |++⟩. Still a
          product; still two independent arrows. Nothing a single-qubit gate does can ever change
          that, however many you apply.
        </>
      ),
    },
    {
      label: 'CZ',
      text: (
        <>
          The controlled-Z gate flips the sign of exactly one amplitude, the |11⟩ one. Look at
          what that does to the individual arrows: both collapse to the centre of their spheres.
          Each qubit alone is now in a completely random state — yet the pair is in a perfectly
          definite pure state. The information has moved from the parts into the correlations.
          That is entanglement, and this is the gate the Rydberg blockade implements in{' '}
          {PAPER.rydberg.gateNs} ns.
        </>
      ),
    },
    {
      label: 'H on B → Bell pair',
      text: (
        <>
          A final Hadamard on B turns the four equal-magnitude amplitudes into the Bell state
          (|00⟩ + |11⟩)/√2: the qubits are found either both 0 or both 1, never mixed. H · CZ · H
          on the target is exactly a CNOT, which is why CZ plus single-qubit rotations is a
          universal entangling toolkit. The arrows are still at the centre — entanglement is not
          undone by local gates.
        </>
      ),
    },
  ];

  return (
    <>
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="F22"
        title="Building a Bell pair one gate at a time"
        caption={
          <>
            Top: the circuit, with the current gate highlighted. Middle: the four amplitudes of the
            two-qubit state as bars (height |amplitude|, colour = sign: cream +, amber −). Bottom:
            the reduced Bloch vector of each qubit, r<sub>A</sub> and r<sub>B</sub>, computed by tracing
            out the partner; its length² is 2·purity − 1, so a length of zero means the qubit alone
            is maximally mixed. Single-qubit gates rotate the arrows; only CZ shortens them.
          </>
        }
      >
        <Panel tag="a" title={`after: ${STAGES[step]!.gate}`} wide>
          <canvas ref={canvasRef} className="sketch" />
          <p className="board-cap">
            |r<sub>A</sub>| = {Math.hypot(...reducedBloch(STAGES[step]!.state, 0)).toFixed(2)} · |r<sub>B</sub>| ={' '}
            {Math.hypot(...reducedBloch(STAGES[step]!.state, 1)).toFixed(2)} · purity of A ={' '}
            {purityOf(reducedBloch(STAGES[step]!.state, 0)).toFixed(2)} · P(00,01,10,11) = {probabilities(STAGES[step]!.state).map((p) => p.toFixed(2)).join(', ')}
          </p>
        </Panel>
      </Figure>
    </>
  );
}

function draw(canvas: HTMLCanvasElement, step: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const st = STAGES[step]!;
  // --- circuit
  const cx0 = 60;
  const cw = 100;
  const yA = 34;
  const yB = 64;
  ctx.strokeStyle = '#3a3c40';
  ctx.beginPath();
  ctx.moveTo(cx0 - 20, yA);
  ctx.lineTo(cx0 + 4 * cw + 20, yA);
  ctx.moveTo(cx0 - 20, yB);
  ctx.lineTo(cx0 + 4 * cw + 20, yB);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('A |0⟩', 4, yA + 4);
  ctx.fillText('B |0⟩', 4, yB + 4);
  const box = (x: number, y: number, label: string, active: boolean, done: boolean) => {
    ctx.fillStyle = active ? AMBER : done ? '#2a2c30' : '#141517';
    ctx.fillRect(x - 14, y - 12, 28, 24);
    ctx.strokeStyle = active ? AMBER : '#3a3c40';
    ctx.strokeRect(x - 14, y - 12, 28, 24);
    ctx.fillStyle = active ? '#0c0d0e' : CREAM;
    ctx.font = MONO;
    ctx.fillText(label, x - 4, y + 4);
  };
  box(cx0 + 1 * cw, yA, 'H', step === 1, step > 1);
  box(cx0 + 2 * cw, yB, 'H', step === 2, step > 2);
  // CZ
  const xcz = cx0 + 3 * cw;
  ctx.strokeStyle = step === 3 ? AMBER : step > 3 ? '#6b6d72' : '#3a3c40';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xcz, yA);
  ctx.lineTo(xcz, yB);
  ctx.stroke();
  ctx.fillStyle = step === 3 ? AMBER : step > 3 ? '#6b6d72' : '#3a3c40';
  ctx.beginPath();
  ctx.arc(xcz, yA, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(xcz, yB, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.fillStyle = MUTED;
  ctx.fillText('CZ', xcz - 8, yB + 20);
  box(cx0 + 4 * cw, yB, 'H', step === 4, false);

  // --- amplitudes
  const ax = 40;
  const ay = 100;
  const aw = 300;
  const ah = 190;
  frame(ctx, ax, ay, aw, ah, 'amplitudes ⟨ij|ψ⟩');
  const labels = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
  const bw = 50;
  st.state.forEach((amp, i) => {
    const mag = Math.hypot(amp[0], amp[1]);
    const neg = amp[0] < -1e-9;
    const x = ax + 30 + i * 68;
    const hgt = mag * (ah - 70);
    ctx.fillStyle = '#1b1c1f';
    ctx.fillRect(x, ay + 30, bw, ah - 70);
    ctx.fillStyle = neg ? AMBER : CREAM;
    ctx.fillRect(x, ay + 30 + (ah - 70) - hgt, bw, hgt);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText(labels[i]!, x + 8, ay + ah - 24);
    ctx.fillStyle = neg ? AMBER : CREAM;
    ctx.fillText(mag < 1e-9 ? '0' : `${neg ? '−' : '+'}${mag.toFixed(2)}`, x + 4, ay + ah - 8);
  });
  ctx.fillStyle = MUTED;
  ctx.font = SANS;
  ctx.fillText(`state: ${describe(step)}`, ax, ay + ah + 18);

  // --- reduced Bloch vectors
  for (const q of [0, 1] as const) {
    const cx = 420 + q * 130;
    const cy = 200;
    const R = 50;
    drawSphere(ctx, cx, cy, R, { labels: false });
    const r = reducedBloch(st.state, q);
    const len = Math.hypot(...r);
    if (len > 1e-6) drawVector(ctx, cx, cy, R, r, q === 0 ? BLUE : VIOLET, 2.2, 4.5);
    else {
      ctx.fillStyle = q === 0 ? BLUE : VIOLET;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = CREAM;
    ctx.font = SANS;
    ctx.fillText(q === 0 ? 'qubit A alone' : 'qubit B alone', cx - 34, cy - R - 14);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText(`|r| = ${len.toFixed(2)}`, cx - 24, cy + R + 22);
    ctx.fillText(len < 1e-6 ? 'maximally mixed' : 'pure', cx - 30, cy + R + 36);
  }
}

function describe(step: number): string {
  return ['|00⟩ (product)', '(|00⟩ + |10⟩)/√2 (product)', '(|00⟩+|01⟩+|10⟩+|11⟩)/2 (product)', '(|00⟩+|01⟩+|10⟩−|11⟩)/2 (entangled)', '(|00⟩ + |11⟩)/√2 (Bell)'][step] ?? '';
}
