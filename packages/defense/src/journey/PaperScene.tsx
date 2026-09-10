import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import JourneyScene, { Apparatus, Atom, Beam, Glow, Label, Ring, Trap } from './JourneyScene.tsx';
import { rotatedPatch } from '../data/paperJourney.ts';

type V3 = [number, number, number];
const GOLD = '#efc27d', CYAN = '#73dcd9', BLUE = '#849cff', RED = '#ed9987';
export type PaperControls = {
  zone: number;
  readState: 'zero' | 'one' | 'lost';
  readStep: number;
  distance: 3 | 5;
  gateMode: 'transversal' | 'surgery';
  gateStep: number;
  universalStep: number;
  cycleStep: number;
  cycle: number;
};

function GlidingGroup({ to, reducedMotion, children }: { to: V3; reducedMotion: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const initial = useRef(to);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(0.1, dt) * 4);
    ref.current.position.lerp(new THREE.Vector3(...to), k);
  });
  return <group ref={ref} position={initial.current}>{children}</group>;
}

function Block({ at = [0, 0, 0], rows = 3, cols = 3, spacing = 0.48, color = GOLD, traps = false, dim = false }: {
  at?: V3; rows?: number; cols?: number; spacing?: number; color?: string; traps?: boolean; dim?: boolean;
}) {
  return <group position={at}>
    {Array.from({ length: rows * cols }, (_, i) => {
      const p: V3 = [((i % cols) - (cols - 1) / 2) * spacing, 0, (Math.floor(i / cols) - (rows - 1) / 2) * spacing];
      return <group key={i}><Atom position={p} radius={0.11} color={dim ? '#3d6570' : color} cloud={false} />{traps && <Trap at={p} />}</group>;
    })}
    <RoundedBox args={[cols * spacing + 0.18, 0.025, rows * spacing + 0.18]} position={[0, -0.17, 0]} radius={0.07}>
      <meshBasicMaterial color={color} transparent opacity={dim ? 0.025 : 0.055} />
    </RoundedBox>
  </group>;
}

const ZONES = [
  { z: -3.9, title: 'STORAGE', detail: 'Keep quantum information protected', color: CYAN },
  { z: -1.3, title: 'ENTANGLING', detail: 'Bring atoms together for gates', color: BLUE },
  { z: 1.3, title: 'READOUT', detail: 'Image, cool, and initialize', color: GOLD },
  { z: 3.9, title: 'RESERVOIR', detail: 'Replace missing atoms', color: RED },
] as const;
function ZonedProcessor({ zone, reducedMotion }: { zone: number; reducedMotion: boolean }) {
  return <group>
    {ZONES.map((z, i) => <group key={z.title} position={[0, 0, z.z]}>
      <RoundedBox args={[6.3, 0.06, 2.05]} radius={0.12} position={[0, -0.35, 0]}>
        <meshStandardMaterial color={z.color} metalness={0.55} roughness={0.3} transparent opacity={0.13} />
      </RoundedBox>
      <Line points={[[-3.2, -0.27, -1], [3.2, -0.27, -1]]} color={z.color} lineWidth={1} />
      <Label at={[-4.1, 0.1, 0]} color={z.color}>{z.title}</Label>
      {i === 3 ? <><Block at={[-1.7, 0, 0]} rows={3} color={RED} /><Block at={[1.7, 0, 0]} rows={3} color={RED} /></>
        : <Block at={[1.7, 0, 0]} color={z.color} traps={i === 0} />}
    </group>)}
    <GlidingGroup to={[-1.7, 0, ZONES[zone]!.z]} reducedMotion={reducedMotion}>
      <Block color={GOLD} traps />
      <Label at={[0, 0.6, 0]}>MOVABLE BLOCK</Label>
    </GlidingGroup>
    {zone === 1 && <><Beam start={[-3.2, 0, -1.3]} end={[3.2, 0, -1.3]} color={BLUE} /><Beam start={[3.2, 0.12, -1.3]} end={[-3.2, 0.12, -1.3]} color={RED} /></>}
    {zone === 2 && <group position={[1.7, 0, -3.9]}><Glow radius={1.4} color={CYAN} /><Label at={[0, 1.9, 0]} color={CYAN}>STORAGE SHIELDED</Label></group>}
  </group>;
}

function PaperReadout({ state, step, reducedMotion }: { state: PaperControls['readState']; step: number; reducedMotion: boolean }) {
  const separated = step >= 1;
  const x = separated && state === 'one' ? 1.25 : -1.25;
  return <group>
    <Trap at={[-1.25, 0, 0]} large />
    {separated && <Trap at={[1.25, 0, 0]} large />}
    {state !== 'lost' && <GlidingGroup to={[x, 0, 0]} reducedMotion={reducedMotion}><Atom radius={0.4} color={state === 'one' ? CYAN : GOLD} /></GlidingGroup>}
    {[-1.25, 1.25].map((x, i) => <group key={x} position={[x, 0, 0]}>
      <Ring radius={0.44} color={i === 0 ? GOLD : CYAN} tube={0.015} />
      <Label at={[0, -0.9, 0]} color={i === 0 ? GOLD : CYAN}>{i === 0 ? 'HOME POSITION · 0' : 'SHIFTED POSITION · 1'}</Label>
    </group>)}
    <Line points={[[-1.25, -1.5, 0], [1.25, -1.5, 0]]} color="#6d8b98" lineWidth={1} />
    <Label at={[0, -1.8, 0]} color="#b4cbd2">≈ 2 μm IN THE EXPERIMENT</Label>
    {step === 0 && <Label at={[0, 2.15, 0]}>MAP CLOCK STATES TO STRETCHED STATES</Label>}
    {step === 1 && <Label at={[0, 2.15, 0]}>LATTICE PINS 0 · AOD MOVES 1</Label>}
    {step === 2 && <>
      <Beam start={[-4, 0.05, 0]} end={[4, 0.05, 0]} color={RED} radius={0.02} />
      <Label at={[0, 2.15, 0]} color={CYAN}>{state === 'lost' ? 'BOTH POSITIONS EMPTY → LOSS FLAG' : 'FLUORESCENCE IMAGE → CLASSICAL RECORD'}</Label>
    </>}
  </group>;
}

function CodePatch({ distance }: { distance: 3 | 5 }) {
  const patch = useMemo(() => rotatedPatch(distance), [distance]);
  const scale = 0.86;
  return <group>
    {patch.checks.map((check, i) => {
      const points = check.support.map((p) => patch.data[p]!);
      const color = check.type === 'X' ? CYAN : BLUE;
      return <group key={i}>
        {points.map((p, j) => <Line key={j} points={[[check.x * scale, 0.03, check.z * scale], [p.x * scale, 0, p.z * scale]]} color={color} transparent opacity={0.27} lineWidth={1} />)}
        <Atom position={[check.x * scale, 0.03, check.z * scale]} color={CYAN} radius={0.09} cloud={false} />
        <mesh position={[check.x * scale, -0.15, check.z * scale]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[scale * 0.90, scale * 0.90]} /><meshBasicMaterial color={color} transparent opacity={0.065} side={THREE.DoubleSide} />
        </mesh>
      </group>;
    })}
    {patch.data.map((p, i) => <Atom key={i} position={[p.x * scale, 0, p.z * scale]} color={GOLD} radius={0.15} cloud={false} />)}
    <Label at={[0, 0.1, -3.35]}>DISTANCE {distance} · ONE LOGICAL QUBIT</Label>
    <Label at={[0, -0.2, 3.3]} color={CYAN}>LOCAL ERROR CHECKS</Label>
    <gridHelper args={[9, 18, '#26464b', '#122a33']} position={[0, -0.35, 0]} />
  </group>;
}

function LogicalGate({ mode, step, reducedMotion }: { mode: PaperControls['gateMode']; step: number; reducedMotion: boolean }) {
  const paired = mode === 'transversal' && step > 0;
  const leftX = paired ? -0.15 : -2.15;
  const rightX = paired ? 0.15 : 2.15;
  return <group>
    <GlidingGroup to={[leftX, 0, 0]} reducedMotion={reducedMotion}><Block color={GOLD} spacing={0.9} traps /></GlidingGroup>
    <GlidingGroup to={[rightX, 0, 0]} reducedMotion={reducedMotion}><Block color={CYAN} spacing={0.9} traps /></GlidingGroup>
    <Label at={[paired ? -1.55 : -2.15, 2.2, 0]}>ENCODED BLOCK A</Label>
    <Label at={[paired ? 1.55 : 2.15, 2.2, 0]} color={CYAN}>ENCODED BLOCK B</Label>
    {mode === 'surgery' && step > 0 && <group>
      {[-0.7, 0, 0.7].map((z) => <group key={z}>
        <Atom position={[0, 0, z]} radius={0.14} color={step === 2 ? RED : BLUE} />
        <Line points={[[-1.4, 0, z], [0, 0, z], [1.4, 0, z]]} color={BLUE} lineWidth={2} />
      </group>)}
      <Label at={[0, -1.3, 0]} color={BLUE}>JOINT PARITY MEASUREMENTS</Label>
    </group>}
    {mode === 'transversal' && step === 2 && <>
      <Beam start={[-4, 0.02, 0]} end={[4, 0.02, 0]} color={BLUE} radius={0.07} />
      <Beam start={[4, 0.15, 0]} end={[-4, 0.15, 0]} color={RED} radius={0.03} />
      {Array.from({ length: 9 }, (_, i) => {
        const x = ((i % 3) - 1) * 0.9, z = (Math.floor(i / 3) - 1) * 0.9;
        return <group key={i} position={[x, 0, z]}>
          <Line points={[[-0.15, 0.03, 0], [0.15, 0.03, 0]]} color={BLUE} lineWidth={3} />
          <Glow radius={0.24} color={BLUE} />
        </group>;
      })}
    </>}
    <Label at={[0, -2.2, 0]} color={mode === 'transversal' ? GOLD : BLUE}>{mode === 'transversal' ? 'MATCHING PAIRS · PARALLEL GATES' : 'JOINT CHECKS · LOGICAL OPERATION'}</Label>
  </group>;
}

function Universality({ step }: { step: number }) {
  return <group>
    {[-2.5, 0, 2.5].map((x, i) => <group key={x}>
      <Block at={[x, 0, 0]} cols={3} rows={5} color={i === 0 ? GOLD : CYAN} dim={step >= 2 && i === 0} />
      <Label at={[x, 1.2, 0]} color={i === 0 ? GOLD : CYAN}>{i === 0 ? (step >= 2 ? 'MEASURED IN X' : 'ENCODED INPUT') : '|T_L⟩ HELPER'}</Label>
      <Label at={[x, -0.45, 1.9]} color="#9eb5c0">REED–MULLER BLOCK</Label>
    </group>)}
    {step >= 1 && [-1.25, 1.25].map((x) => <group key={x}>
      <Line points={[[x - 0.6, 0.6, 0], [x + 0.6, 0.6, 0]]} color={BLUE} lineWidth={3} />
      <Label at={[x, 2.1, 0]} color={BLUE}>CZ</Label>
    </group>)}
    <Label at={[0, 3.1, 0]} color={GOLD}>{['PREPARE THE LOGICAL RESOURCE STATES', 'ENTANGLE THE LOGICAL BLOCKS', 'MEASURE · TELEPORT WITH AN H OPERATION', 'TRACK MEASUREMENT-DEPENDENT BRANCHES IN SOFTWARE'][step]}</Label>
  </group>;
}

function Reuse({ step, cycle, reducedMotion }: { step: number; cycle: number; reducedMotion: boolean }) {
  // Two representative blocks. The paper's Fig. 6 uses entire alternating groups of blocks.
  const oldA = cycle % 2 === 1;
  const oldX = oldA ? -2.1 : 2.1;
  const freshX = -oldX;
  const infoX = step >= 2 ? freshX : oldX;
  return <group>
    {[-2.1, 2.1].map((x, i) => <group key={x}>
      <Block at={[x, 0, 0]} cols={3} rows={3} color={x === infoX ? GOLD : CYAN} dim={step === 2 && x === oldX} />
      <Label at={[x, 2.1, 0]} color={x === infoX ? GOLD : CYAN}>GROUP {i === 0 ? 'A' : 'B'}</Label>
      <Label at={[x, -0.9, 0]} color={x === infoX ? GOLD : CYAN}>{x === infoX ? 'LOGICAL INFORMATION' : step === 3 ? 'COOL · REFILL · INITIALIZE' : step === 2 ? 'READY FOR RESET' : 'FRESHLY PREPARED'}</Label>
    </group>)}
    <GlidingGroup to={[infoX, 0.8, 0]} reducedMotion={reducedMotion}>
      <group rotation={[Math.PI / 2, 0, 0]}><Ring radius={0.5} color={GOLD} tube={0.019} /></group>
      <Label at={[0, 0.75, 0]}>LOGICAL STATE</Label>
    </GlidingGroup>
    {step >= 1 && <Line points={[[oldX, 0.6, 0], [freshX, 0.6, 0]]} color={step >= 2 ? GOLD : BLUE} lineWidth={2} dashed dashSize={0.08} gapSize={0.08} />}
    <Block at={[0, -0.3, 3.2]} rows={2} cols={5} color={RED} />
    <Label at={[0, -0.2, 4.05]} color={RED}>RESERVOIR · REPLACEMENT ATOMS</Label>
    {step === 3 && <Line points={[[0, -0.1, 2.9], [oldX, -0.1, 0.6]]} color={RED} lineWidth={2} dashed />}
    <Label at={[0, 3.2, 0]} color={CYAN}>{['ENCODE FRESH BLOCKS', 'TRANSVERSAL ENTANGLING GATE', 'READ OLD · STORE NEW', 'RESET · SWAP ROLES'][step]}</Label>
  </group>;
}

const RIGS: V3[] = [[10.3, 7.5, 12.4], [7.5, 11.5, 12.5], [1.5, 2.8, 10.5], [5.7, 9.3, 8.8], [2, 4.3, 12], [2, 5, 13.8], [2.5, 5.5, 13.8]];
export default function PaperScene({ chapter, controls: p, reducedMotion, reset, onInteract }: {
  chapter: number; controls: PaperControls; reducedMotion: boolean; reset: number; onInteract: () => void;
}) {
  return <JourneyScene chapter={chapter} rigs={RIGS} angle={0} phase={0} spacing={1} entangled={false} outcome={null} error={null} reducedMotion={reducedMotion} reset={reset} onInteract={onInteract}>
    {chapter === 0 && <Apparatus chapter={0} spacing={1} />}
    {chapter === 1 && <ZonedProcessor zone={p.zone} reducedMotion={reducedMotion} />}
    {chapter === 2 && <PaperReadout state={p.readState} step={p.readStep} reducedMotion={reducedMotion} />}
    {chapter === 3 && <CodePatch distance={p.distance} />}
    {chapter === 4 && <LogicalGate mode={p.gateMode} step={p.gateStep} reducedMotion={reducedMotion} />}
    {chapter === 5 && <Universality step={p.universalStep} />}
    {chapter === 6 && <Reuse step={p.cycleStep} cycle={p.cycle} reducedMotion={reducedMotion} />}
  </JourneyScene>;
}
