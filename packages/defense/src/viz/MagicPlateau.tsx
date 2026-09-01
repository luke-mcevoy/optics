import { useState } from 'react';
import { Figure, Panel } from '../components/Figure.tsx';
import { Steps, type StepDef } from '../components/Steps.tsx';

const W = 640;
const H = 330;
const PAD = { l: 52, r: 16, t: 78, b: 46 };

type Trace = {
  id: string;
  label: string;
  spacingDeg: number;
  color: string;
};

const TRACES: readonly Trace[] = [
  { id: 'bare', label: 'bare physical qubits — robust at 180°', spacingDeg: 180, color: '#9aa6b2' },
  { id: 'steane', label: '2D Steane [[7,1,3]] — robust at 90° (transversal S)', spacingDeg: 90, color: '#6ea8d4' },
  { id: 'rm', label: '3D Reed–Muller [[15,1,3]] — robust at 45° (transversal T)', spacingDeg: 45, color: '#b08ad6' },
];

/** Schematic plateau shape: flat near multiples of the robust spacing, dipping between. */
function plateau(phiDeg: number, spacingDeg: number): number {
  const c = (1 + Math.cos((2 * Math.PI * phiDeg) / spacingDeg)) / 2;
  return c ** 0.3;
}

function x(phi: number): number {
  return PAD.l + ((W - PAD.l - PAD.r) * phi) / 180;
}

function y(v: number): number {
  return PAD.t + (H - PAD.t - PAD.b) * (1 - v);
}

export function MagicPlateau() {
  const [step, setStep] = useState(0);
  const emphasis: readonly string[] = (
    [['bare'], ['bare', 'steane'], ['bare', 'steane', 'rm']] as const
  )[step] ?? ['bare', 'steane', 'rm'];

  const steps: readonly StepDef[] = [
    {
      label: 'the experiment',
      text: (
        <>
          The paper&rsquo;s probe (its Fig. 4a): rotate <em>every physical atom</em> by the same
          angle φ about z, then ask the decoder what happened to the logical qubit. Start with
          the grey trace — unentangled physical qubits. Their expectation value only survives at
          0° and 180°: any intermediate global rotation is just an error, and there is no code
          structure to absorb it.
        </>
      ),
    },
    {
      label: 'the 2D code',
      text: (
        <>
          Now the cyan trace, a 2D Steane code. New plateaus appear at multiples of 90°. Reason:
          on this code, rotating every physical qubit by 90° <em>is</em> a valid logical
          operation (a transversal S gate) — so the decoder absorbs it and the logical state
          survives. Robust angles are exactly the rotations the code structure turns into logic.
        </>
      ),
    },
    {
      label: 'the 3D magic',
      text: (
        <>
          The violet trace, a 3D Reed–Muller code, adds plateaus at 45° — and 45° is the T gate,
          the non-Clifford operation no 2D code can do transversally. The paper shows this
          plateau appears <em>only</em> when the block is correctly entangled with all stabilizer
          signs +1: physical entanglement is literally what buys the magic. Teleporting through
          such a block is how the machine gets every rotation.
        </>
      ),
    },
  ];

  return (
    <div className="board">
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="14"
        title="Robust angles are the gates the code can absorb"
        caption={
          <>
            Schematic after the paper&rsquo;s Fig. 4a — shape only, not measured values. A global
            z-rotation by φ is applied to every physical qubit and the surviving logical
            expectation is plotted. Bare qubits are robust only at multiples of 180°; the 2D
            Steane code also at 90° (its transversal S); the 3D Reed–Muller code also at 45°,
            which is a transversal T — a non-Clifford gate. The measured curves, including the
            requirement that all stabilizer signs be +1 for the 45° plateau to appear, are in the
            paper; the raw data and decoding notebook are public on Zenodo
            (doi:10.5281/zenodo.15685795).
          </>
        }
      >
        <Panel tag="a" title="Logical expectation vs global rotation angle (schematic)" wide>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Plateau schematic">
            <line x1={PAD.l} y1={y(0)} x2={W - PAD.r} y2={y(0)} stroke="#4f555c" />
            <line x1={PAD.l} y1={y(0)} x2={PAD.l} y2={y(1)} stroke="#4f555c" />
            <text x={PAD.l - 8} y={y(1) + 4} textAnchor="end" fill="#9b9790" fontSize="11">
              1
            </text>
            <text x={PAD.l - 8} y={y(0) + 4} textAnchor="end" fill="#9b9790" fontSize="11">
              0
            </text>
            {[0, 45, 90, 135, 180].map((phi) => (
              <g key={phi}>
                <line
                  x1={x(phi)}
                  y1={y(0)}
                  x2={x(phi)}
                  y2={y(1)}
                  stroke={phi % 90 === 0 ? '#1d1e20' : '#241f2b'}
                />
                <text x={x(phi)} y={y(0) + 18} textAnchor="middle" fill="#9b9790" fontSize="11">
                  {phi}°
                </text>
              </g>
            ))}
            <text x={(x(0) + x(180)) / 2} y={H - 6} textAnchor="middle" fill="#9b9790" fontSize="11">
              global physical rotation φ
            </text>

            {step === 2 ? (
              <g>
                <line x1={x(45)} y1={y(1)} x2={x(45)} y2={y(0)} stroke="#b08ad6" strokeDasharray="4 3" opacity="0.7" />
                <text x={x(45)} y={PAD.t - 5} textAnchor="middle" fill="#b08ad6" fontSize="11" fontWeight="700">
                  T gate
                </text>
                <line x1={x(135)} y1={y(1)} x2={x(135)} y2={y(0)} stroke="#b08ad6" strokeDasharray="4 3" opacity="0.7" />
              </g>
            ) : null}

            {TRACES.map((trace) => {
              const active = emphasis.includes(trace.id);
              const pts = Array.from({ length: 361 }, (_, i) => {
                const phi = (i / 360) * 180;
                return `${x(phi)},${y(plateau(phi, trace.spacingDeg))}`;
              }).join(' ');
              return (
                <polyline
                  key={trace.id}
                  points={pts}
                  fill="none"
                  stroke={trace.color}
                  strokeWidth={active ? 2.2 : 1}
                  opacity={active ? 0.95 : 0.25}
                />
              );
            })}

            {TRACES.map((trace, i) => (
              <g key={trace.id} opacity={emphasis.includes(trace.id) ? 1 : 0.35}>
                <line
                  x1={PAD.l + 8}
                  y1={14 + i * 16}
                  x2={PAD.l + 26}
                  y2={14 + i * 16}
                  stroke={trace.color}
                  strokeWidth="2.2"
                />
                <text x={PAD.l + 32} y={18 + i * 16} fill="#9b9790" fontSize="10.5">
                  {trace.label}
                </text>
              </g>
            ))}
          </svg>
        </Panel>
      </Figure>
    </div>
  );
}
