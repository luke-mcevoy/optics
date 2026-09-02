import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { blockadeRadiusUm, rbC6EstimateGHzUm6 } from '../../physics/beams.ts';
import { meanRadiusUm, vdwShiftMHz } from '../../physics/rydberg.ts';
import { Callout } from '../../viz3d/Callout.tsx';
import { Stage3D } from '../../viz3d/Stage3D.tsx';
import { lcg } from './bloch2d.ts';

const WORLD_PER_UM = 1.0;

export function VdwPair3D() {
  const [rUm, setRUm] = useState<number>(PAPER.beams.pairSpacingUm);
  const [omegaMHz, setOmegaMHz] = useState<number>(PAPER.rydberg.rabiMHz);
  const n = PAPER.rydberg.n;
  const c6 = rbC6EstimateGHzUm6(n);
  const vMHz = vdwShiftMHz(n, rUm);
  const rb = blockadeRadiusUm(c6, omegaMHz);
  const blocked = rUm < rb;

  return (
    <Figure
      n="F19"
      title="Two Rydberg atoms: fluctuating dipoles, a 1/R⁶ shift, and a blockade sphere"
      caption={
        <>
          Two {n}S atoms (orbitals drawn to scale: ⟨r⟩ = {meanRadiusUm(n).toFixed(2)} μm) a distance R
          apart. A Rydberg atom has no permanent dipole, but its electron cloud fluctuates; the
          instantaneous dipole of one atom polarises the other, and the correlated fluctuation
          (arrows) lowers or raises the pair energy in second-order perturbation theory:
          V = C₆/R⁶, the van der Waals interaction, with C₆ ∝ n*¹¹ because the dipoles scale as
          n*² and the level spacing as n*⁻³. The translucent sphere is the blockade radius
          R<sub>b</sub> = (C₆/ħΩ)<sup>1/6</sup>: inside it the shift exceeds the laser&rsquo;s
          Rabi frequency, so the pair state |rr⟩ is off resonance and cannot be excited. With the
          paper&rsquo;s Ω/2π = {PAPER.rydberg.rabiMHz} MHz, R<sub>b</sub> ≈ {blockadeRadiusUm(c6, PAPER.rydberg.rabiMHz).toFixed(1)} μm — more than twice
          the {PAPER.beams.pairSpacingUm} μm gate spacing. C₆ here is the n*¹¹ estimate anchored on 70S.
        </>
      }
    >
      <Panel tag="a" title={`R = ${rUm.toFixed(1)} μm · V/h = ${fmtMHz(vMHz)} · ${blocked ? 'BLOCKADED' : 'not blockaded'}`} wide>
        <div className="slider-pair">
          <Slider label="Separation R" value={rUm} min={1} max={10} step={0.1} unit="μm" display={rUm.toFixed(1)} onChange={setRUm} />
          <Slider label="Rydberg Rabi frequency Ω/2π" value={omegaMHz} min={0.5} max={20} step={0.1} unit="MHz" display={omegaMHz.toFixed(1)} onChange={setOmegaMHz} />
        </div>
        <Stage3D rig={{ position: [0, 6.5, 12.5], target: [0, 0, 0] }} autoRotate={false} minDistance={4} maxDistance={30} tall>
          <PairScene rUm={rUm} rb={rb} blocked={blocked} n={n} vMHz={vMHz} />
        </Stage3D>
        <p className="board-cap">
          C₆/h ≈ {c6.toFixed(1)} GHz μm⁶ · V/h = C₆/R⁶ = {fmtMHz(vMHz)} · ħΩ ↔ {omegaMHz.toFixed(1)} MHz · V/ħΩ = {(vMHz / omegaMHz).toExponential(2)} ·
          R<sub>b</sub> = {rb.toFixed(2)} μm
        </p>
      </Panel>
    </Figure>
  );
}

function fmtMHz(v: number): string {
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)} GHz`;
  if (v >= 1) return `${v.toFixed(1)} MHz`;
  return `${(v * 1e3).toFixed(0)} kHz`;
}

function PairScene({ rUm, rb, blocked, n, vMHz }: { rUm: number; rb: number; blocked: boolean; n: number; vMHz: number }) {
  const rOrb = meanRadiusUm(n) * WORLD_PER_UM * 2.2; // draw the cloud out to ~2⟨r⟩
  const half = (rUm * WORLD_PER_UM) / 2;
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const cloudA = useRef<THREE.Points>(null);
  const cloudB = useRef<THREE.Points>(null);
  const rand = useMemo(() => lcg(31), []);
  const N = 500;
  const cloudGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i += 1) {
      // shell-like Rydberg S orbital: radius near ⟨r⟩ with spread
      const r = 0.55 + 0.45 * rand() ** 0.5;
      const u = rand() * 2 - 1;
      const ph = rand() * 2 * Math.PI;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(ph);
      pos[i * 3 + 1] = r * s * Math.sin(ph);
      pos[i * 3 + 2] = r * u;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tRef = useRef(0);
  useFrame((_, dt) => {
    tRef.current += dt;
    const t = tRef.current;
    // correlated dipole fluctuation: both clouds shift along the axis, anti-aligned (attractive configuration)
    const amp = 0.18 * rOrb;
    const dx = amp * Math.sin(3.1 * t) + 0.5 * amp * Math.sin(7.3 * t + 1);
    if (cloudA.current) cloudA.current.position.x = dx;
    if (cloudB.current) cloudB.current.position.x = dx; // same direction ⇒ dipoles head-to-tail along the axis
    if (a.current) a.current.position.x = -half;
    if (b.current) b.current.position.x = half;
  });
  const arrowLen = 0.5 * rOrb;
  return (
    <group>
      {[a, b].map((ref, i) => (
        <group key={i} ref={ref} position={[i === 0 ? -half : half, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#e8e4dc" emissive="#ffffff" emissiveIntensity={0.6} />
          </mesh>
          <points ref={i === 0 ? cloudA : cloudB} geometry={cloudGeom} scale={[rOrb, rOrb, rOrb]}>
            <pointsMaterial color={blocked ? '#d4a24a' : '#6ea8d4'} size={0.05} transparent opacity={0.65} sizeAttenuation depthWrite={false} />
          </points>
          <DipoleArrow length={arrowLen} colour={blocked ? '#ffd58a' : '#8fc1e8'} />
          <Callout position={[0, rOrb + 0.35, 0]} fixed small>{`${n}S atom ${i === 0 ? 'A' : 'B'}`}</Callout>
        </group>
      ))}
      {/* separation line */}
      <mesh position={[0, -rOrb - 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, rUm * WORLD_PER_UM, 6]} />
        <meshBasicMaterial color="#8b8680" />
      </mesh>
      <Callout position={[0, -rOrb - 0.6, 0]} fixed small>{`R = ${rUm.toFixed(1)} μm · V/h = ${fmtMHz(vMHz)}`}</Callout>
      {/* blockade sphere around atom A */}
      <mesh position={[-half, 0, 0]}>
        <sphereGeometry args={[rb * WORLD_PER_UM, 40, 40]} />
        <meshBasicMaterial color={blocked ? '#d4a24a' : '#6ea8d4'} transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[-half, 0, 0]}>
        <sphereGeometry args={[rb * WORLD_PER_UM, 18, 12]} />
        <meshBasicMaterial color={blocked ? '#d4a24a' : '#6ea8d4'} wireframe transparent opacity={0.045} />
      </mesh>
      <Callout position={[-half, rb * WORLD_PER_UM + 0.3, 0]} fixed small>{`blockade radius R_b = ${rb.toFixed(1)} μm`}</Callout>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.6} />
    </group>
  );
}

function DipoleArrow({ length, colour }: { length: number; colour: string }) {
  const g = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  useFrame((_, dt) => {
    tRef.current += dt;
    const t = tRef.current;
    const s = Math.sin(3.1 * t) + 0.5 * Math.sin(7.3 * t + 1);
    if (g.current) {
      g.current.scale.set(1, Math.max(0.05, Math.abs(s)), 1);
      g.current.rotation.z = s >= 0 ? -Math.PI / 2 : Math.PI / 2; // along ±x
    }
  });
  return (
    <group ref={g}>
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, length, 8]} />
        <meshBasicMaterial color={colour} />
      </mesh>
      <mesh position={[0, length + 0.1, 0]}>
        <coneGeometry args={[0.09, 0.22, 10]} />
        <meshBasicMaterial color={colour} />
      </mesh>
    </group>
  );
}
