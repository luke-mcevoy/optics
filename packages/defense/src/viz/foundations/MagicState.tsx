import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { PAPER } from '../../data/paper.ts';
import type { Vec3 } from '../../physics/qubit.ts';
import { type Amp, apply1, cnot, H_GATE, type Mat2, reducedBloch, type State, X_GATE } from '../../physics/twoqubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, drawSphere, drawVector, frame, GREEN, MONO, MUTED, RED, toScreen, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 340;

const S_GATE: Mat2 = [[1, 0], [0, 0], [0, 0], [0, 1]];
const T_GATE: Mat2 = [[1, 0], [0, 0], [0, 0], [Math.SQRT1_2, Math.SQRT1_2]];
const GATES: { name: string; m: Mat2; clifford: boolean }[] = [
  { name: 'H', m: H_GATE, clifford: true },
  { name: 'S', m: S_GATE, clifford: true },
  { name: 'X', m: X_GATE, clifford: true },
  { name: 'T', m: T_GATE, clifford: false },
];

// single-qubit state as a 2-vector of complex amplitudes
type Q = [Amp, Amp];
const KET0: Q = [[1, 0], [0, 0]];
function applyQ(q: Q, m: Mat2): Q {
  const mul = (a: Amp, b: Amp): Amp => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const add = (a: Amp, b: Amp): Amp => [a[0] + b[0], a[1] + b[1]];
  return [add(mul(m[0], q[0]), mul(m[1], q[1])), add(mul(m[2], q[0]), mul(m[3], q[1]))];
}
function blochOf(q: Q): Vec3 {
  const [a, b] = q;
  const x = 2 * (a[0] * b[0] + a[1] * b[1]);
  const y = 2 * (a[0] * b[1] - a[1] * b[0]);
  const z = a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]);
  return [x, y, z];
}
const OCTA: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function isStabilizer(r: Vec3): boolean {
  return OCTA.some((o) => Math.hypot(o[0] - r[0], o[1] - r[1], o[2] - r[2]) < 1e-6);
}

const TELE_STEPS: StepDef[] = [
  { label: 'prepare', text: 'Data qubit in |ψ⟩ (here cos 60°·|0⟩ + sin 60°·|1⟩), ancilla in the magic state |T⟩ = (|0⟩ + e^{iπ/4}|1⟩)/√2. Making |T⟩ well is the hard, non-transversal part — done once, offline, and checked (“distilled”).' },
  { label: 'CNOT', text: 'A CNOT with the ancilla as control and the data as target — a Clifford gate, cheap and transversal on the code.' },
  { label: 'measure', text: 'Measure the data qubit in Z. Both outcomes are equally likely; the ancilla is now T|ψ⟩ (outcome 0) or a Clifford-rotated version of it (outcome 1).' },
  { label: 'fix', text: 'On outcome 1 apply S·X to the ancilla — another Clifford. Either way the ancilla ends in T|ψ⟩: a non-Clifford gate performed using only Cliffords, a measurement, and one magic state.' },
];

export function MagicState() {
  const [q, setQ] = useState<Q>(KET0);
  const [history, setHistory] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [outcome, setOutcome] = useState<0 | 1>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const r = blochOf(q);
  const stab = isStabilizer(r);
  const tele = teleport(step, outcome);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, r, stab, history, tele, step, outcome);
  }, [r, stab, history, tele, step, outcome]);
  return (
    <>
      <Steps steps={TELE_STEPS} current={step} onStep={setStep} />
      <Figure
        n="F30"
        title="Cheap gates, expensive gates, and the magic state"
        caption={
          <>
            <strong>a</strong>, The six <em>stabilizer states</em> — the octahedron&rsquo;s vertices
            ±x, ±y, ±z — are the only single-qubit states reachable from |0⟩ with Clifford gates
            (H, S, X and their products): Cliffords permute the vertices. They are also exactly
            the states, and gates, that a classical computer can track efficiently
            (Gottesman–Knill), so a circuit of them alone is not a quantum computer. Press T and the
            arrow leaves the octahedron: |T⟩ = T|+⟩ sits at 45° between x and y. Eastin–Knill
            forbids any code from applying a universal gate set transversally, and for the surface
            code the transversal set is Clifford — so T must come from elsewhere. <strong>b</strong>,
            Gate teleportation: consume one prepared |T⟩ to apply T to a data qubit using only
            Clifford gates and a measurement. The paper&rsquo;s {PAPER.codes.tGatesShown} logical
            T gates and its “magic-state” plateau (chapter 13) are this circuit, run on encoded
            qubits.
          </>
        }
      >
        <Panel tag="a" title={`|ψ⟩ ${stab ? 'is a stabilizer state' : 'is NOT a stabilizer state (magic)'} · teleportation step: ${TELE_STEPS[step]!.label}`} wide>
          <div className="mode-row">
            {GATES.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => {
                  setQ(applyQ(q, g.m));
                  setHistory((h) => [...h.slice(-11), g.name]);
                }}
                title={g.clifford ? 'Clifford' : 'non-Clifford'}
              >
                {g.name}
                {g.clifford ? '' : ' ✦'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setQ(KET0);
                setHistory([]);
              }}
            >
              reset |0⟩
            </button>
            <span className="mode-gap" />
            <button type="button" className={outcome === 0 ? 'active' : undefined} onClick={() => setOutcome(0)}>
              b: outcome 0
            </button>
            <button type="button" className={outcome === 1 ? 'active' : undefined} onClick={() => setOutcome(1)}>
              b: outcome 1
            </button>
          </div>
          <canvas ref={canvasRef} className="sketch" />
        </Panel>
      </Figure>
    </>
  );
}

type Tele = { anc: Vec3; data: Vec3; ancPure: boolean; target: Vec3; done: boolean };

/** Two-qubit simulation of T-gate injection: qubit 0 = ancilla |T⟩, qubit 1 = data |+⟩. */
function teleport(step: number, outcome: 0 | 1): Tele {
  const Z: Amp = [0, 0];
  const tAmp: Amp = [Math.SQRT1_2 * Math.SQRT1_2, Math.SQRT1_2 * Math.SQRT1_2]; // e^{iπ/4}/√2
  const anc: Q = [[Math.SQRT1_2, 0], tAmp];
  const data: Q = [[Math.cos(Math.PI / 3), 0], [Math.sin(Math.PI / 3), 0]];
  const prod = (a: Q, b: Q): State => {
    const mul = (x: Amp, y: Amp): Amp => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
    return [mul(a[0], b[0]), mul(a[0], b[1]), mul(a[1], b[0]), mul(a[1], b[1])];
  };
  let s: State = prod(anc, data);
  const target = blochOf(applyQ(data, T_GATE));
  if (step >= 1) s = cnot(s);
  let ancPure = step < 1;
  if (step >= 2) {
    // project data qubit (qubit 1) onto outcome and renormalise
    const keep = (i: number) => (i & 1) === outcome;
    const raw = s.map((a, i) => (keep(i) ? a : Z)) as unknown as State;
    const norm = Math.sqrt(raw.reduce((acc, a) => acc + a[0] * a[0] + a[1] * a[1], 0));
    s = raw.map((a) => [a[0] / norm, a[1] / norm] as Amp) as unknown as State;
    ancPure = true;
  }
  if (step >= 3 && outcome === 1) {
    s = apply1(s, X_GATE, 0);
    s = apply1(s, S_GATE, 0);
  }
  return { anc: reducedBloch(s, 0), data: reducedBloch(s, 1), ancPure, target, done: step >= 3 || (step >= 2 && outcome === 0) };
}

function draw(canvas: HTMLCanvasElement, r: Vec3, stab: boolean, history: string[], tele: Tele, step: number, outcome: 0 | 1): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  ctx.font = MONO;
  // --- a: Bloch with octahedron
  const cx = 150;
  const cy = 160;
  const R = 105;
  frame(ctx, 16, 16, 280, 308, 'a  stabilizer octahedron');
  drawSphere(ctx, cx, cy, R);
  ctx.strokeStyle = 'rgba(110,168,212,0.35)';
  const P = (v: Vec3) => toScreen(v, cx, cy, R);
  const ring = [OCTA[0]!, OCTA[2]!, OCTA[1]!, OCTA[3]!];
  for (const top of [OCTA[4]!, OCTA[5]!]) {
    for (let i = 0; i < 4; i += 1) {
      const a = P(ring[i]!);
      const b = P(ring[(i + 1) % 4]!);
      const t = P(top);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(t[0], t[1]);
      ctx.stroke();
    }
  }
  for (const o of OCTA) {
    const [x, y] = P(o);
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  drawVector(ctx, cx, cy, R, r, stab ? BLUE : AMBER);
  ctx.fillStyle = stab ? BLUE : AMBER;
  ctx.fillText(stab ? 'stabilizer state' : 'magic (non-stabilizer)', 28, 292);
  ctx.fillStyle = MUTED;
  ctx.fillText(`r = (${r.map((v) => (Math.abs(v) < 5e-3 ? 0 : v).toFixed(2)).join(', ')})`, 28, 306);
  ctx.fillText(`gates: ${history.length === 0 ? '—' : history.join(' ')}`, 28, 320);

  // --- b: teleportation circuit + Bloch of ancilla
  const bx = 312;
  frame(ctx, bx, 16, 332, 308, 'b  T-gate injection');
  const wire = [70, 120];
  ctx.strokeStyle = '#4a4c50';
  for (const y of wire) {
    ctx.beginPath();
    ctx.moveTo(bx + 60, y);
    ctx.lineTo(bx + 205, y);
    ctx.stroke();
  }
  ctx.fillStyle = MUTED;
  ctx.fillText('|T⟩ anc', bx + 8, wire[0]! + 4);
  ctx.fillText('|ψ⟩ data', bx + 8, wire[1]! + 4);
  const dim = '#3a3c40';
  // cnot
  const gx = bx + 100;
  ctx.strokeStyle = step >= 1 ? CREAM : dim;
  ctx.fillStyle = step >= 1 ? CREAM : dim;
  ctx.beginPath();
  ctx.moveTo(gx, wire[0]!);
  ctx.lineTo(gx, wire[1]!);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gx, wire[0]!, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(gx, wire[1]!, 7, 0, Math.PI * 2);
  ctx.stroke();
  // meter on data
  const mx = bx + 135;
  ctx.strokeStyle = step >= 2 ? VIOLET : dim;
  ctx.strokeRect(mx - 10, wire[1]! - 9, 20, 18);
  ctx.beginPath();
  ctx.arc(mx, wire[1]! + 5, 7, Math.PI, 2 * Math.PI);
  ctx.stroke();
  if (step >= 2) {
    ctx.fillStyle = VIOLET;
    ctx.fillText(`m = ${outcome}`, mx - 12, wire[1]! + 30);
  }
  // correction on ancilla
  const kx = bx + 172;
  const fixOn = step >= 3 && outcome === 1;
  ctx.strokeStyle = fixOn ? GREEN : step >= 3 ? dim : dim;
  ctx.fillStyle = fixOn ? GREEN : dim;
  ctx.strokeRect(kx - 14, wire[0]! - 9, 28, 18);
  ctx.fillText('SX', kx - 8, wire[0]! + 4);
  ctx.fillStyle = MUTED;
  ctx.fillText('if m=1', kx - 16, wire[0]! - 14);
  // ancilla Bloch
  const ax = bx + 275;
  const ay = 90;
  const aR = 46;
  drawSphere(ctx, ax, ay, aR, { labels: false });
  drawVector(ctx, ax, ay, aR, tele.target, 'rgba(212,162,74,0.35)');
  drawVector(ctx, ax, ay, aR, tele.anc, tele.done ? GREEN : tele.ancPure ? CREAM : MUTED);
  ctx.fillStyle = MUTED;
  ctx.fillText('ancilla', ax - 20, ay + aR + 14);
  ctx.fillText('faint: T|ψ⟩', ax - 30, ay + aR + 28);
  // status text
  const lines: string[] = [];
  if (step === 0) lines.push('|T⟩ ⊗ |ψ⟩ : two product states.', 'Ancilla arrow sits off the', 'octahedron: the magic is here.');
  if (step === 1) lines.push('After CNOT the pair is entangled;', 'each arrow alone is shortened', '(mixed) — see the ancilla.');
  if (step === 2) lines.push(outcome === 0 ? 'm = 0: ancilla is already T|ψ⟩.' : 'm = 1: ancilla is a Clifford twist', outcome === 0 ? 'Done — no correction needed.' : 'of T|ψ⟩; S·X will finish it.');
  if (step === 3) lines.push('Ancilla = T|ψ⟩ for either outcome.', 'The data qubit is consumed;', 'the ancilla is the new data qubit.');
  ctx.fillStyle = CREAM;
  lines.forEach((t, i) => ctx.fillText(t, bx + 10, 190 + i * 16));
  ctx.fillStyle = tele.done ? GREEN : MUTED;
  const err = Math.hypot(tele.anc[0] - tele.target[0], tele.anc[1] - tele.target[1], tele.anc[2] - tele.target[2]);
  ctx.fillText(`|r_anc − r_target| = ${err.toFixed(3)}`, bx + 10, 262);
  ctx.fillStyle = MUTED;
  ctx.fillText(`|r_anc| = ${Math.hypot(...tele.anc).toFixed(2)}  |r_data| = ${Math.hypot(...tele.data).toFixed(2)}`, bx + 10, 280);
  ctx.fillStyle = RED;
  ctx.fillText('T is the only non-Clifford gate here', bx + 10, 306);
}
