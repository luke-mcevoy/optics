import { useRef, useState } from 'react';
import { Figure, Panel } from '../components/Figure.tsx';
import { PAPER } from '../data/paper.ts';
import { Callout } from '../viz3d/Callout.tsx';
import { LaserRay, ZoneBox } from '../viz3d/Optics.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';
import { useRaf } from './useRaf.ts';

const CYCLE_S = 16;
const N = 6;
const LOST = 4; // ancilla index that is lost during imaging
const BRIGHT = [true, false, true, true, true, false] as const;

const Y_DATA_STORE = 1.9;
const Y_ANC_STORE = 1.42;
const Y_DATA_GATE = 0.26;
const Y_ANC_GATE = -0.26;
const Y_READ = -1.85;

type Phase = {
  name: string;
  t0: number;
  t1: number;
  text: string;
};

const PHASES: readonly Phase[] = [
  {
    name: 'Hold',
    t0: 0,
    t1: 0.1,
    text: 'Data qubits (gold) and a fresh block of ancillas (cyan) sit in storage under the 1,529 nm shield; hyperfine T₂ > 1 s with dynamical decoupling. Nothing else touches them.',
  },
  {
    name: 'Interleave',
    t0: 0.1,
    t1: 0.28,
    text: 'The crossed-AOD tweezers carry both rows into the entangling zone, pairing each ancilla with a data qubit. The storage and entangling zones sit 40–50 μm apart; moving atoms dominates a QEC round — about 2.57 ms of the 4.45 ms total in the surface-code experiment.',
  },
  {
    name: 'Entangle',
    t0: 0.28,
    t1: 0.38,
    text: `One global 270 ns pulse (420 + 1013 nm, through n = ${PAPER.rydberg.n}) applies the same ~99.6% CZ to every interleaved pair simultaneously. The parallelism is optical: one beam, many gates.`,
  },
  {
    name: 'Separate',
    t0: 0.38,
    t1: 0.58,
    text: 'Data qubits go home to storage; the used block — now carrying the parity information — rides down to the readout zone (four rows of traps under counter-propagating 780 nm imaging beams and the 795 nm lattice). In the surface-code benchmark the used ancillas were instead parked in storage and every block was read out together at the end.',
  },
  {
    name: 'Measure',
    t0: 0.58,
    t1: 0.72,
    text: 'Spin-to-position conversion, then a camera exposure. Bright = one clock state, dark = the other; bit-flip error 0.46(4)%. An empty site — atom loss, 0.24(2)% — is not a wrong answer. It is a flagged erasure.',
  },
  {
    name: 'Reset',
    t0: 0.72,
    t1: 0.94,
    text: 'The same atoms are re-cooled (1D PGC + EIT in a finite field), re-pumped with 24 Raman-assisted cycles, and reused; the lost atom is replaced from the reservoir (up to 196 spares, six rows). Entropy leaves the machine as scattered photons and discarded atoms.',
  },
  {
    name: 'Decode',
    t0: 0.94,
    t1: 1,
    text: 'Clicks and erasure flags go to the neural-network decoder; the correction is tracked in software as a Pauli frame — no corrective pulse needed. Then the next layer begins. In the deep-circuit runs one such layer took 41.9 ms, limited by desktop image processing.',
  },
];

function seg(t: number, t0: number, t1: number): number {
  return Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
}

function ss(u: number): number {
  return u * u * (3 - 2 * u);
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function atomX(i: number): number {
  return (i - (N - 1) / 2) * 0.78;
}

function dataY(t: number): number {
  if (t < 0.1) return Y_DATA_STORE;
  if (t < 0.28) return lerp(Y_DATA_STORE, Y_DATA_GATE, ss(seg(t, 0.1, 0.28)));
  if (t < 0.38) return Y_DATA_GATE;
  if (t < 0.58) return lerp(Y_DATA_GATE, Y_DATA_STORE, ss(seg(t, 0.38, 0.58)));
  return Y_DATA_STORE;
}

function ancY(t: number): number {
  if (t < 0.1) return Y_ANC_STORE;
  if (t < 0.28) return lerp(Y_ANC_STORE, Y_ANC_GATE, ss(seg(t, 0.1, 0.28)));
  if (t < 0.38) return Y_ANC_GATE;
  if (t < 0.58) return lerp(Y_ANC_GATE, Y_READ, ss(seg(t, 0.38, 0.58)));
  if (t < 0.72) return Y_READ;
  if (t < 0.94) return lerp(Y_READ, Y_ANC_STORE, ss(seg(t, 0.72, 0.94)));
  return Y_ANC_STORE;
}

/** sin² envelope inside a phase window, zero outside. */
function pulse(t: number, t0: number, t1: number): number {
  if (t < t0 || t > t1) return 0;
  return Math.sin(Math.PI * seg(t, t0, t1)) ** 2;
}

export function MachineCycle() {
  const [t, setT] = useState(0.02);
  const [playing, setPlaying] = useState(true);
  const lastRef = useRef<number | null>(null);

  useRaf((nowMs) => {
    const last = lastRef.current;
    lastRef.current = nowMs;
    if (!playing || last === null) return;
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    setT((prev) => (prev + dt / CYCLE_S) % 1);
  });

  const phaseIdx = Math.max(
    0,
    PHASES.findIndex((p) => t >= p.t0 && t < p.t1),
  );
  const phase = PHASES[phaseIdx] ?? PHASES[0];

  return (
    <Figure
      n="9"
      title="One layer of the machine's cycle, as choreography"
      caption={
        <>
          One move–gate–measure–reset layer of the four-zone processor, animated in the
          configuration used for the deep-circuit experiments (Figs. 5–6): the block that just
          did its job is measured non-destructively, reset in place, topped up from the reservoir
          and reused. Gold atoms are data qubits; cyan atoms are the working block; grey atoms
          wait in the reservoir. Scrub the timeline or let it play. The animation is <em>not</em>{' '}
          to time scale — a 270 ns gate sits between millisecond-scale moves — and one entangling
          layer is shown where a real surface-code round interleaves each ancilla with four data
          neighbours through several move–gate steps. Note the surface-code benchmark of Fig. 2
          differs in one respect: used ancilla blocks were parked in storage and all read out at
          the end (&ldquo;delayed erasure&rdquo;), not measured every round. Durations and
          error rates: Methods of the paper.
        </>
      }
    >
      <Panel tag="a" title="Storage → entangle → read out → refill" wide>
        <div className="phase-strip">
          {PHASES.map((p, i) => (
            <button
              key={p.name}
              type="button"
              className={i === phaseIdx ? 'phase-chip active' : 'phase-chip'}
              onClick={() => {
                setT((p.t0 + p.t1) / 2);
                setPlaying(false);
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <Stage3D camera={[0, 1.1, 9.8]}>
          <CycleScene t={t} />
        </Stage3D>
        <div className="cycle-controls">
          <button type="button" className="play-btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'pause' : 'play'}
          </button>
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(t * 1000)}
            onChange={(event) => {
              setT(Number(event.target.value) / 1000);
              setPlaying(false);
            }}
            aria-label="cycle timeline"
          />
        </div>
        <p className="board-cap">
          <strong>{phase?.name}.</strong> {phase?.text}
        </p>
      </Panel>
    </Figure>
  );
}

function CycleScene({ t }: { t: number }) {
  const gate = pulse(t, 0.28, 0.38);
  const image = pulse(t, 0.58, 0.72);
  const measuring = t >= 0.58 && t < 0.72;
  // lost ancilla shrinks away mid-image and stays gone until the next round
  const lostScale = t < 0.62 ? 1 : t < 0.7 ? 1 - ss(seg(t, 0.62, 0.7)) : 0;
  // replacement atom flies from the reservoir during refill
  const rep = ss(seg(t, 0.74, 0.92));
  const repColor = rep > 0.85 ? '#5ec8e5' : '#9aa6b2';

  return (
    <group>
      <ZoneBox position={[0, 1.66, 0]} size={[6, 1.3, 2.2]} color="#f5b942" />
      <ZoneBox position={[0, 0, 0]} size={[6, 1.3, 2.2]} color="#c9a0ff" />
      <ZoneBox position={[-0.55, -1.85, 0]} size={[4.9, 1.05, 2.2]} color="#5ec8e5" />
      <ZoneBox position={[3.35, -1.85, 0]} size={[1.7, 1.05, 2.0]} color="#9aa6b2" />
      <Callout position={[-3.9, 1.66, 0]}>storage</Callout>
      <Callout position={[-3.9, 0, 0]}>entangling</Callout>
      <Callout position={[-3.9, -1.85, 0]}>readout</Callout>
      <Callout position={[3.35, -2.75, 0]}>reservoir</Callout>

      {Array.from({ length: N }, (_, i) => (
        <Atom key={`d${i}`} position={[atomX(i), dataY(t), 0]} color="#f5b942" intensity={1.8} />
      ))}

      {Array.from({ length: N }, (_, i) => {
        const isLost = i === LOST;
        const scale = isLost ? lostScale : 1;
        if (scale <= 0.01) return null;
        let intensity = 1.8;
        if (measuring && !isLost) intensity = BRIGHT[i] === true ? 5.5 : 0.35;
        return (
          <Atom
            key={`a${i}`}
            position={[atomX(i), ancY(t), 0]}
            color="#5ec8e5"
            intensity={intensity}
            scale={scale}
          />
        );
      })}

      {/* reservoir: one spare that flies up as a replacement, one that stays */}
      <Atom
        position={[lerp(3.15, atomX(LOST), rep), lerp(-1.85, Y_ANC_STORE, rep), lerp(0.3, 0, rep)]}
        color={repColor}
        intensity={1.4}
      />
      <Atom position={[3.6, -1.85, -0.25]} color="#9aa6b2" intensity={1.2} />

      {gate > 0.03 && (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[6, 1.3, 2.2]} />
            <meshBasicMaterial color="#8a6cff" transparent opacity={0.3 * gate} depthWrite={false} />
          </mesh>
          <LaserRay start={[-3.8, 0.06, 0]} end={[3.8, 0.06, 0]} color="#7c6cff" />
          <LaserRay start={[-3.8, -0.06, 0]} end={[3.8, -0.06, 0]} color="#a04040" />
        </group>
      )}

      {image > 0.03 && (
        <mesh position={[-0.55, -1.85, 0]}>
          <boxGeometry args={[4.9, 1.05, 2.2]} />
          <meshBasicMaterial color="#5ec8e5" transparent opacity={0.22 * image} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function Atom({
  position,
  color,
  intensity,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  intensity: number;
  scale?: number;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[0.1, 20, 20]} />
      <meshStandardMaterial
        color="#ffe8c2"
        emissive={color}
        emissiveIntensity={intensity}
        roughness={0.25}
      />
    </mesh>
  );
}
