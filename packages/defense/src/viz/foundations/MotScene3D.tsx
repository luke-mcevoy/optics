import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { PAPER } from '../../data/paper.ts';
import { Callout } from '../../viz3d/Callout.tsx';
import { GaussianTube } from '../../viz3d/Beams.tsx';
import { Stage3D } from '../../viz3d/Stage3D.tsx';
import { lcg } from './bloch2d.ts';

const N_ATOMS = 420;
const BOX = 3.2; // half-size of the initial cloud (world units)
const BEAM_LEN = 9;
const BEAM_W = 0.9;

type Phase = 'beams' | 'field' | 'mot';

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function MotScene3D() {
  const [step, setStep] = useState(0);
  const phase: Phase = step === 0 ? 'beams' : step === 1 ? 'field' : 'mot';
  const [seed, setSeed] = useState(1);

  const steps: readonly StepDef[] = [
    {
      label: 'six beams: cooling',
      text: (
        <>
          Three pairs of counter-propagating red-detuned beams, one pair per axis. Each pair is
          the friction force of the previous figure, so together they damp motion in all three
          directions — optical molasses. Atoms slow down but they do not gather: the force depends
          on velocity, not position, so a slow atom drifts wherever it happens to be, and out.
        </>
      ),
    },
    {
      label: 'add a field gradient',
      text: (
        <>
          Two coils with opposite currents (anti-Helmholtz) make a magnetic field that is zero at
          the centre and grows linearly away from it. Through the Zeeman effect (see{' '}
          <a href="#/foundations/rubidium-atom/zeeman">the rubidium page</a>) the atom&rsquo;s
          resonance now depends on <em>where</em> it is, and — because the beams are circularly
          polarised with opposite handedness — an atom displaced to one side is shifted closer to
          resonance with the beam that pushes it back.
        </>
      ),
    },
    {
      label: 'magneto-optical trap',
      text: (
        <>
          Friction plus a restoring force: F ≈ −αv − κr. The cloud collapses to the field zero and
          stays there, at a temperature near the Doppler limit and a density limited by the atoms
          reabsorbing each other&rsquo;s light. This is the source of every atom in the machine: a
          MOT of millions of atoms is loaded in the glass cell, then the tweezers pick single atoms
          out of it ({PAPER.loadingPct}% of sites filled after an initial load; guide, chapter 05).
        </>
      ),
    },
  ];

  return (
    <>
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="F15"
        title="The magneto-optical trap, in three moves"
        caption={
          <>
            Six red-detuned beams along ±x, ±y, ±z (wavefronts animated) and a pair of
            anti-Helmholtz coils. The {N_ATOMS} atoms follow a damped-and-restored equation of motion,
            F = −αv − κ(B) r plus random recoil kicks, integrated live; α is switched on with the
            beams and κ with the coils. Step through: molasses alone slows atoms but lets them
            wander off; the field gradient adds position dependence; together they make a trap.
            The illustration is schematic (world units, not micrometres): a real MOT cloud is a
            few hundred micrometres across, holds 10⁶–10⁹ atoms, and forms in tens of
            milliseconds.
          </>
        }
      >
        <Panel tag="a" title={phase === 'beams' ? 'optical molasses' : phase === 'field' ? 'quadrupole field, no restoring force yet' : 'MOT: cooling + confinement'} wide>
          <Stage3D rig={{ position: [8.5, 5.5, 9.5], target: [0, 0, 0] }} autoRotate={false} minDistance={4} maxDistance={26} tall>
            <MotWorld phase={phase} seed={seed} />
          </Stage3D>
          <div className="mode-row">
            <button type="button" onClick={() => setSeed((s) => s + 1)}>
              release a fresh hot cloud
            </button>
          </div>
        </Panel>
      </Figure>
    </>
  );
}

function MotWorld({ phase, seed }: { phase: Phase; seed: number }) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const state = useMemo(() => {
    const rand = lcg(seed * 7919);
    const pos = new Float32Array(N_ATOMS * 3);
    const vel = new Float32Array(N_ATOMS * 3);
    for (let i = 0; i < N_ATOMS; i += 1) {
      for (let a = 0; a < 3; a += 1) {
        pos[i * 3 + a] = (rand() * 2 - 1) * BOX;
        vel[i * 3 + a] = 1.6 * gaussian(rand);
      }
    }
    return { pos, vel, rand };
  }, [seed]);

  const coilGain = useRef(0);
  const beamGain = useRef(1);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.04, dtRaw);
    const { pos, vel, rand } = state;
    const friction = phase === 'beams' || phase === 'mot' ? 2.2 : 0;
    const spring = phase === 'mot' ? 3.0 : 0;
    const kick = phase === 'beams' || phase === 'mot' ? 0.9 : 0;
    coilGain.current += ((phase === 'beams' ? 0 : 1) - coilGain.current) * Math.min(1, 4 * dt);
    const m = inst.current;
    for (let i = 0; i < N_ATOMS; i += 1) {
      for (let a = 0; a < 3; a += 1) {
        const p = pos[i * 3 + a]!;
        let v = vel[i * 3 + a]!;
        const inBeam = Math.abs(p) < BEAM_LEN / 2;
        const f = (inBeam ? -friction * v : 0) - spring * p * (Math.abs(p) < BEAM_W * 2.2 ? 1 : 0.35);
        v += f * dt + kick * Math.sqrt(dt) * gaussian(rand) * (inBeam ? 1 : 0);
        let np = p + v * dt;
        if (Math.abs(np) > 5.5) {
          // atom left the scene: recycle from the edge with a fresh thermal velocity
          np = (rand() * 2 - 1) * BOX;
          v = 1.6 * gaussian(rand);
        }
        pos[i * 3 + a] = np;
        vel[i * 3 + a] = v;
      }
      if (m) {
        dummy.position.set(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!);
        const r2 = dummy.position.lengthSq();
        const s = 0.6 + 0.6 * Math.exp(-r2 / 2.5);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
    }
    if (m) m.instanceMatrix.needsUpdate = true;
  });

  const beamColor = '#d84a3a';
  const axes: readonly { rot: [number, number, number]; label: string; pos: [number, number, number] }[] = [
    { rot: [0, 0, 0], label: 'σ⁺ / σ⁻ pair along x', pos: [BEAM_LEN / 2 - 0.3, -BEAM_W - 0.5, 0] },
    { rot: [0, 0, Math.PI / 2], label: 'pair along y', pos: [0, BEAM_LEN / 2 - 0.2, BEAM_W + 0.4] },
    { rot: [0, Math.PI / 2, 0], label: 'pair along z', pos: [0, BEAM_W + 0.3, BEAM_LEN / 2 - 0.3] },
  ];

  return (
    <group>
      {axes.map((a) => (
        <group key={a.label} rotation={a.rot}>
          <GaussianTube center={[0, 0, 0]} length={BEAM_LEN} wy={BEAM_W} wz={BEAM_W} color={beamColor} mode={1} k={6} speed={9} opacity={0.05} gainRef={beamGain} />
          <Callout position={a.pos} fixed small showWithin={30}>
            {a.label}
          </Callout>
        </group>
      ))}
      {/* anti-Helmholtz coils */}
      <CoilPair gain={coilGain} />
      <instancedMesh ref={inst} args={[undefined, undefined, N_ATOMS]} frustumCulled={false}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffe0b0" emissive="#ffb347" emissiveIntensity={1.6} roughness={0.4} />
      </instancedMesh>
      <Callout position={[0, -3.9, 0]} fixed small showWithin={30}>
        {phase === 'beams' ? 'B = 0 everywhere: no restoring force' : 'B = 0 at the centre, grows linearly outward'}
      </Callout>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 3]} intensity={0.7} />
    </group>
  );
}

function CoilPair({ gain }: { gain: { current: number } }) {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const arrows = useRef<THREE.Group>(null);
  useFrame(() => {
    for (const m of mats.current) m.emissiveIntensity = 0.05 + 0.6 * gain.current;
    if (arrows.current) arrows.current.visible = gain.current > 0.3;
  });
  return (
    <group>
      {[2.6, -2.6].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.4, 0.16, 12, 72]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color="#8a5a30"
            metalness={0.8}
            roughness={0.35}
            emissive="#ff8a3d"
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}
      <Callout position={[2.8, 2.9, 0]} fixed small showWithin={30}>
        anti-Helmholtz coils (opposite currents)
      </Callout>
      {/* field-gradient hint: short arrows pointing outward along ±y, inward along ±x/z */}
      <group ref={arrows} visible={false}>
        {[
          [0, 1.4, 0, 0, 1, 0],
          [0, -1.4, 0, 0, -1, 0],
          [1.4, 0, 0, -1, 0, 0],
          [-1.4, 0, 0, 1, 0, 0],
          [0, 0, 1.4, 0, 0, -1],
          [0, 0, -1.4, 0, 0, 1],
        ].map((a, i) => {
          const dir = new THREE.Vector3(a[3]!, a[4]!, a[5]!);
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          return (
            <group key={i} position={[a[0]!, a[1]!, a[2]!]} quaternion={q}>
              <mesh position={[0, 0.3, 0]}>
                <coneGeometry args={[0.08, 0.25, 10]} />
                <meshBasicMaterial color="#6ea8d4" transparent opacity={0.8} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
                <meshBasicMaterial color="#6ea8d4" transparent opacity={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
