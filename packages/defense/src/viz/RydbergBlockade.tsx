import { useMemo, useState } from 'react';
import { Text } from '@react-three/drei';
import { PAPER } from '../data/paper.ts';
import { Slider } from '../components/Slider.tsx';
import { Claim } from '../components/Claim.tsx';
import { Figure, Panel } from '../components/Figure.tsx';
import { Steps, type StepDef } from '../components/Steps.tsx';
import { blockadeRadius, rydbergC6Scale } from '../physics/formulas.ts';
import { AtomCloud } from '../viz3d/AtomCloud.tsx';
import { LaserRay } from '../viz3d/Optics.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';

function illustrativeC6(n: number): number {
  const relativeN = rydbergC6Scale(n) / rydbergC6Scale(PAPER.rydberg.n);
  return PAPER.rydberg.rabiMHz * 10 ** 6 * relativeN;
}

function PairPotential({
  n,
  sep,
  drive,
}: {
  n: number;
  sep: number;
  drive: number;
}) {
  const w = 460;
  const h = 240;
  const pad = { l: 58, r: 18, t: 18, b: 42 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const minR = 4;
  const maxR = 22;
  const c6 = illustrativeC6(n);
  const rb = blockadeRadius(c6, drive);
  const potential = (r: number) => c6 / r ** 6;
  const yMin = Math.min(potential(maxR), drive) / 1.5;
  const yMax = Math.max(potential(minR), drive) * 1.5;
  const logMin = Math.log10(yMin);
  const logMax = Math.log10(yMax);
  const x = (r: number) => pad.l + ((r - minR) / (maxR - minR)) * innerW;
  const y = (value: number) => pad.t + innerH - ((Math.log10(value) - logMin) / (logMax - logMin)) * innerH;
  const points = Array.from({ length: 120 }, (_, index) => {
    const r = minR + (index / 119) * (maxR - minR);
    return `${x(r)},${y(potential(r))}`;
  }).join(' ');
  const blockadeEdge = x(Math.min(Math.max(rb, minR), maxR));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Illustrative Rydberg pair potential and blockade region">
      {rb > minR ? (
        <rect
          x={pad.l}
          y={pad.t}
          width={blockadeEdge - pad.l}
          height={innerH}
          fill="#c9a0ff"
          opacity="0.1"
        />
      ) : null}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#4f555c" />
      <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="#4f555c" />
      <polyline points={points} fill="none" stroke="#c9a0ff" strokeWidth="2.2" />
      <line x1={pad.l} y1={y(drive)} x2={pad.l + innerW} y2={y(drive)} stroke="#5ec8e5" strokeWidth="1.7" />
      <text x={pad.l + innerW - 4} y={y(drive) - 6} textAnchor="end" fill="#5ec8e5" fontSize="11">
        Ω/2π = {drive.toFixed(1)} MHz
      </text>
      <line x1={x(sep)} y1={pad.t} x2={x(sep)} y2={pad.t + innerH} stroke="#ff7a7a" strokeDasharray="4 3" />
      <text x={x(sep) + 4} y={pad.t + 12} fill="#ff7a7a" fontSize="10">live R</text>
      {rb > minR && rb < maxR ? (
        <>
          <line x1={x(rb)} y1={pad.t} x2={x(rb)} y2={pad.t + innerH} stroke="#e8e4dc" strokeDasharray="3 3" />
          <text x={x(rb) + 4} y={pad.t + innerH - 8} fill="#e8e4dc" fontSize="10">R_b</text>
        </>
      ) : null}
      <text x={pad.l + 8} y={pad.t + 16} fill="#c9a0ff" fontSize="11">blockade: V &gt; Ω</text>
      <text x={pad.l} y={h - 10} fill="#8b8680" fontSize="10">R (arbitrary spacing units)</text>
      <text x="13" y="126" fill="#8b8680" fontSize="10" transform="rotate(-90 13 126)">
        V(R)/h (MHz-equivalent, log scale)
      </text>
      <text x={pad.l - 6} y={pad.t + 4} textAnchor="end" fill="#8b8680" fontSize="9">{yMax.toExponential(1)}</text>
      <text x={pad.l - 6} y={pad.t + innerH + 3} textAnchor="end" fill="#8b8680" fontSize="9">{yMin.toExponential(1)}</text>
    </svg>
  );
}

export function RydbergBlockade() {
  const [step, setStep] = useState(0);
  const [n, setN] = useState<number>(PAPER.rydberg.n);
  const [sep, setSep] = useState(16);
  const [drive, setDrive] = useState<number>(PAPER.rydberg.rabiMHz);

  const numbers = useMemo(() => {
    const c6 = illustrativeC6(n);
    const rb = blockadeRadius(c6, drive);
    const v = c6 / sep ** 6;
    return { rb, blocked: v > drive, ratio: v / drive };
  }, [n, sep, drive]);

  const half = Math.min(3.4, sep * 0.24);
  const cloudScale = 1.3 / (2.2 * n * n);

  const focus: 'a' | 'b' | 'ab' = (['b', 'a', 'a', 'ab'] as const)[step] ?? 'ab';

  const steps: readonly StepDef[] = [
    {
      label: 'two atoms, one laser',
      text: (
        <>
          Panel <strong>b</strong>: two atoms, both excited toward the same Rydberg state, both
          lit by the same drive (the grey line through them). At this spacing the electron
          clouds do not touch and never need to — keep that in mind, because the interaction
          about to appear is <em>not</em> about overlap. R marks the distance between the two
          nuclei.
        </>
      ),
    },
    {
      label: 'the pair shift',
      text: (
        <>
          Panel <strong>a</strong>: the violet curve is the van der Waals shift of the
          doubly excited pair state |rr⟩, V(R) = C₆/R⁶ (drawn with a toy n¹¹ scaling for C₆).
          At large R it is negligible. As the atoms get closer it climbs — steeply, because of
          the sixth power. The cyan horizontal line is the only other energy in the problem:
          the drive strength Ω.
        </>
      ),
    },
    {
      label: 'inside the blockade',
      text: (
        <>
          We just moved the atoms closer (red dashed line, panel <strong>a</strong>) — inside
          the shaded region where V &gt; Ω. The laser is still resonant with <em>one</em> atom
          going up, but the doubly excited state now misses resonance by V. Both atoms excited
          is off the menu: the claim card below reads ON. The boundary R<sub>b</sub>, where
          V(R) = Ω, is the blockade radius.
        </>
      ),
    },
    {
      label: 'the gate',
      text: (
        <>
          What happens instead: the pair shares <em>one</em> excitation and oscillates at the
          enhanced rate √2 Ω — watch that emerge from the Schrödinger equation in the next
          figure. Drive a 2π pulse in this blockaded regime and the pair returns to where it
          started but with a conditional π phase: a controlled-Z gate. The paper runs it in
          270 ns at ~99.6% fidelity.
        </>
      ),
    },
  ];

  const applyStep = (i: number) => {
    setStep(i);
    if (i === 0) setSep(16);
    if (i === 2) setSep(7);
  };

  return (
    <div className="board">
      <Steps steps={steps} current={step} onStep={applyStep} />
      <div className="board-grid">
        <Slider label="principal n" value={n} min={20} max={70} step={1} onChange={setN} />
        <Slider label="spacing (arb.)" value={sep} min={4} max={22} step={0.2} display={sep.toFixed(1)} onChange={setSep} />
        <Slider label="Ω_Ryd" value={drive} min={0.5} max={12} step={0.1} unit=" MHz" display={drive.toFixed(1)} onChange={setDrive} />
      </div>
      <Figure
        n="5"
        title="Rydberg blockade is a pair-state energy shift"
        caption={
          <>
            <strong>a</strong>, Illustrative n¹¹ scaling, not 53S spectroscopy. The arbitrary
            normalization sets V/h = 4.6 MHz at R = 10 spacing units for n = 53; only the
            n¹¹/R⁶ dependence is represented. <strong>b</strong>, Distinct atoms separated by R:
            blockade is an energy shift, not overlapping electron clouds. Paper parameters shown
            for context are a 270 ns gate, n = 53, and 420 + 1013 nm excitation.
          </>
        }
      >
        <Panel
          tag="a"
          title="Pair potential — illustrative n¹¹ scaling, not 53S spectroscopy"
          dim={focus === 'b'}
        >
          <PairPotential n={n} sep={sep} drive={drive} />
        </Panel>
        <Panel tag="b" title="Two atoms separated along the internuclear axis" dim={focus === 'a'}>
          <Stage3D camera={[0, 2.2, 9]}>
            <AtomCloud n={n} l={0} color="#8ec8ff" position={[-half, 0, 0]} count={16000} scale={cloudScale} />
            <AtomCloud n={n} l={0} color="#c9a0ff" position={[half, 0, 0]} count={16000} scale={cloudScale} />
            <LaserRay start={[-half - 0.5, 0, 0]} end={[half + 0.5, 0, 0]} color="#6e747b" />
            <LaserRay start={[-half, -1.55, 0]} end={[half, -1.55, 0]} color="#e8e4dc" />
            <LaserRay start={[-half, -1.72, 0]} end={[-half, -1.38, 0]} color="#e8e4dc" />
            <LaserRay start={[half, -1.72, 0]} end={[half, -1.38, 0]} color="#e8e4dc" />
            <Text position={[0, -1.28, 0]} fontSize={0.28} color="#e8e4dc">R</Text>
            <Text position={[0, 0.25, 0]} fontSize={0.22} color="#8b8680">internuclear axis</Text>
          </Stage3D>
        </Panel>
      </Figure>
      <div className="claim-row">
        <Claim value={numbers.blocked ? 'ON' : 'OFF'} unit="illustrative blockade" source="toy V(R)/h > Ω/2π" />
        <Claim value={numbers.ratio.toFixed(2)} unit="V/Ω (toy)" source="normalized n¹¹/R⁶ model" />
        <Claim value={PAPER.rydberg.gateNs} unit="ns gate" source="Methods" />
      </div>
    </div>
  );
}
