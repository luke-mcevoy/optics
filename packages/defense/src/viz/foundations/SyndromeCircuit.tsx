import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 330;

const STEPS: StepDef[] = [
  { label: 'encode', text: 'α|0⟩ + β|1⟩ becomes α|000⟩ + β|111⟩: two CNOTs, no copying — the amplitudes α, β appear once, spread over three qubits.' },
  { label: 'error', text: 'A bit flip X hits the qubit you chose. The state becomes e.g. α|010⟩ + β|101⟩: still a superposition with the same α and β.' },
  { label: 'syndrome', text: 'Two ancillas measure the parities Z₁Z₂ and Z₂Z₃ via CNOTs. Each parity is the same for both branches of the superposition, so reading it reveals nothing about α or β.' },
  { label: 'correct', text: 'The two parity bits (the syndrome) point at exactly one qubit. Apply X there. α and β have not been disturbed at any point.' },
];

type Basis8 = [number, number][]; // 8 complex amplitudes

export function SyndromeCircuit() {
  const [step, setStep] = useState(0);
  const [theta, setTheta] = useState(Math.PI / 3);
  const [phi, setPhi] = useState(Math.PI / 4);
  const [errQubit, setErrQubit] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, step, theta, phi, errQubit);
  }, [step, theta, phi, errQubit]);
  return (
    <>
      <Steps steps={STEPS} current={step} onStep={setStep} />
      <Figure
        n="F26"
        title="Measuring parity without measuring the bit"
        caption={
          <>
            The three-qubit bit-flip code, worked through. The left column shows the amplitudes
            of the eight basis states |q₁q₂q₃⟩ (bar height |amplitude|, colour phase). In every
            frame exactly two bars are non-zero and their heights are |α| = cos θ/2 and |β| = sin
            θ/2 — the encoded information is untouched by the error, by the syndrome
            measurement, and by the correction. The ancilla outcomes depend only on{' '}
            <em>which</em> qubit was flipped, never on α, β: the parity Z₁Z₂ of |010⟩ and of |101⟩
            is the same (−1). Choose a different error qubit and watch the syndrome change while
            the bars do not. Phase flips (Z errors) are invisible to this code; the surface code
            adds a second, X-type family of parity checks that catch them in the same way.
          </>
        }
      >
        <Panel tag="a" title={`after: ${STEPS[step]!.label}`} wide>
          <div className="mode-row">
            {[0, 1, 2].map((q) => (
              <button key={q} type="button" className={errQubit === q ? 'active' : undefined} onClick={() => setErrQubit(q)}>
                error on q{q + 1}
              </button>
            ))}
          </div>
          <div className="slider-pair">
            <Slider label="θ  (sets |α|, |β|)" value={theta} min={0} max={Math.PI} step={0.01} display={`${((theta * 180) / Math.PI).toFixed(0)}°`} onChange={setTheta} />
            <Slider label="φ  (relative phase)" value={phi} min={0} max={2 * Math.PI} step={0.01} display={`${((phi * 180) / Math.PI).toFixed(0)}°`} onChange={setPhi} />
          </div>
          <canvas ref={canvasRef} className="sketch" />
        </Panel>
      </Figure>
    </>
  );
}

function stateAt(step: number, theta: number, phi: number, errQubit: number): { amps: Basis8; syndrome: [number, number] | null } {
  const a: [number, number] = [Math.cos(theta / 2), 0];
  const b: [number, number] = [Math.sin(theta / 2) * Math.cos(phi), Math.sin(theta / 2) * Math.sin(phi)];
  const amps: Basis8 = Array.from({ length: 8 }, () => [0, 0]);
  // encoded: α|000⟩ + β|111⟩ ; index bits q1 q2 q3 → i = q1*4 + q2*2 + q3
  let i0 = 0;
  let i1 = 7;
  if (step >= 1 && step <= 2) {
    const mask = 4 >> errQubit;
    i0 ^= mask;
    i1 ^= mask;
  }
  amps[i0] = a;
  amps[i1] = b;
  let syndrome: [number, number] | null = null;
  if (step >= 2) {
    // parities of the surviving basis state (identical for both branches)
    const q1 = (i0 >> 2) & 1;
    const q2 = (i0 >> 1) & 1;
    const q3 = i0 & 1;
    syndrome = [q1 ^ q2, q2 ^ q3];
  }
  return { amps, syndrome };
}

function draw(canvas: HTMLCanvasElement, step: number, theta: number, phi: number, errQubit: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const { amps, syndrome } = stateAt(step, theta, phi, errQubit);

  // --- circuit
  const cx0 = 250;
  const cw = 390;
  frame(ctx, cx0 - 10, 16, cw + 20, 200, 'circuit');
  const wireY = [50, 80, 110, 150, 180];
  const names = ['q1', 'q2', 'q3', 'a1', 'a2'];
  ctx.font = MONO;
  wireY.forEach((y, i) => {
    ctx.strokeStyle = i >= 3 ? '#3a3c40' : '#4a4c50';
    ctx.beginPath();
    ctx.moveTo(cx0 + 24, y);
    ctx.lineTo(cx0 + cw - 10, y);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.fillText(names[i]!, cx0 - 2, y + 4);
  });
  ctx.fillStyle = MUTED;
  ctx.fillText('|ψ⟩', cx0 + 26, wireY[0]! - 6);
  ctx.fillText('|0⟩', cx0 + 26, wireY[1]! - 6);
  ctx.fillText('|0⟩', cx0 + 26, wireY[2]! - 6);
  ctx.fillText('|0⟩', cx0 + 26, wireY[3]! - 6);
  ctx.fillText('|0⟩', cx0 + 26, wireY[4]! - 6);
  const cnotAt = (x: number, ctrl: number, tgt: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, wireY[ctrl]!);
    ctx.lineTo(x, wireY[tgt]!);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, wireY[ctrl]!, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, wireY[tgt]!, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 7, wireY[tgt]!);
    ctx.lineTo(x + 7, wireY[tgt]!);
    ctx.moveTo(x, wireY[tgt]! - 7);
    ctx.lineTo(x, wireY[tgt]! + 7);
    ctx.stroke();
  };
  const dim = '#3a3c40';
  const on = (k: number) => (step >= k ? CREAM : dim);
  // encode
  cnotAt(cx0 + 70, 0, 1, on(0));
  cnotAt(cx0 + 95, 0, 2, on(0));
  ctx.fillStyle = step === 0 ? AMBER : MUTED;
  ctx.fillText('encode', cx0 + 60, 32);
  // error
  const ex = cx0 + 140;
  ctx.strokeStyle = step >= 1 ? RED : dim;
  ctx.fillStyle = step >= 1 ? RED : dim;
  ctx.strokeRect(ex - 9, wireY[errQubit]! - 9, 18, 18);
  ctx.fillText('X', ex - 4, wireY[errQubit]! + 4);
  ctx.fillStyle = step === 1 ? AMBER : MUTED;
  ctx.fillText('error', ex - 14, 32);
  // syndrome CNOTs
  const sx = cx0 + 195;
  cnotAt(sx, 0, 3, on(2));
  cnotAt(sx + 22, 1, 3, on(2));
  cnotAt(sx + 50, 1, 4, on(2));
  cnotAt(sx + 72, 2, 4, on(2));
  // meters
  for (const k of [3, 4]) {
    const mx = sx + 110;
    ctx.strokeStyle = on(2);
    ctx.strokeRect(mx - 10, wireY[k]! - 9, 20, 18);
    ctx.beginPath();
    ctx.arc(mx, wireY[k]! + 5, 7, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx, wireY[k]! + 5);
    ctx.lineTo(mx + 5, wireY[k]! - 4);
    ctx.stroke();
  }
  ctx.fillStyle = step === 2 ? AMBER : MUTED;
  ctx.fillText('Z1Z2, Z2Z3', sx + 4, 32);
  if (syndrome !== null) {
    ctx.fillStyle = VIOLET;
    ctx.fillText(`${syndrome[0]}`, sx + 128, wireY[3]! + 4);
    ctx.fillText(`${syndrome[1]}`, sx + 128, wireY[4]! + 4);
  }
  // correction
  const kx = cx0 + cw - 40;
  ctx.strokeStyle = step >= 3 ? GREEN : dim;
  ctx.fillStyle = step >= 3 ? GREEN : dim;
  ctx.strokeRect(kx - 9, wireY[errQubit]! - 9, 18, 18);
  ctx.fillText('X', kx - 4, wireY[errQubit]! + 4);
  ctx.fillStyle = step === 3 ? AMBER : MUTED;
  ctx.fillText('fix', kx - 8, 32);

  // syndrome table
  const ty = 232;
  frame(ctx, cx0 - 10, ty - 6, cw + 20, 96, 'syndrome → location');
  const rows: [string, string][] = [
    ['00', 'no error'],
    ['10', 'q1 flipped'],
    ['11', 'q2 flipped'],
    ['01', 'q3 flipped'],
  ];
  rows.forEach(([s, l], i) => {
    const x = cx0 + 6 + (i % 2) * 190;
    const y = ty + 22 + Math.floor(i / 2) * 26;
    const hit = syndrome !== null && `${syndrome[0]}${syndrome[1]}` === s;
    ctx.fillStyle = hit ? VIOLET : MUTED;
    ctx.fillText(`${s}  →  ${l}`, x, y);
  });
  ctx.fillStyle = MUTED;
  ctx.fillText('four outcomes ↔ four cases; the syndrome says nothing about α, β', cx0 + 6, ty + 82);

  // --- amplitudes
  frame(ctx, 16, 16, 214, 296, 'amplitudes of |q1 q2 q3⟩');
  const bx = 30;
  const by = 260;
  const bw = 20;
  const maxH = 180;
  for (let i = 0; i < 8; i += 1) {
    const [re, im] = amps[i]!;
    const mag = Math.hypot(re, im);
    const ph = Math.atan2(im, re);
    const x = bx + i * 24;
    ctx.fillStyle = '#1b1c1f';
    ctx.fillRect(x, by - maxH, bw, maxH);
    if (mag > 1e-6) {
      ctx.fillStyle = phaseColour(ph);
      ctx.fillRect(x, by - mag * maxH, bw, mag * maxH);
    }
    ctx.fillStyle = mag > 1e-6 ? CREAM : '#3a3c40';
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.fillText(i.toString(2).padStart(3, '0'), x + 1, by + 12);
  }
  ctx.font = MONO;
  ctx.fillStyle = MUTED;
  ctx.fillText(`|α| = ${Math.cos(theta / 2).toFixed(2)}  |β| = ${Math.sin(theta / 2).toFixed(2)}`, bx, by + 30);
  ctx.fillText(`phase of β: ${((phi * 180) / Math.PI).toFixed(0)}°  (colour)`, bx, by + 44);
}

function phaseColour(ph: number): string {
  // 0 → blue, π/2 → violet, π → amber, 3π/2 → green
  const t = ((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const stops = [BLUE, VIOLET, AMBER, GREEN, BLUE];
  const seg = (t / (Math.PI / 2)) % 4;
  const i = Math.floor(seg);
  const f = seg - i;
  return mixHex(stops[i]!, stops[i + 1]!, f);
}

function mixHex(a: string, b: string, f: number): string {
  const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16));
  const pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  const m = pa.map((v, i) => Math.round(v + (pb[i]! - v) * f));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
