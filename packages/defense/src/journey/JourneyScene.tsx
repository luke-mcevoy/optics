import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, Line, OrbitControls, RoundedBox } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { blochFromAngles } from '../physics/qubit.ts';

type V3 = [number, number, number];
export type SceneProps = {
  chapter: number;
  angle: number;
  phase: number;
  spacing: number;
  entangled: boolean;
  outcome: number | null;
  error: number | null;
  reducedMotion: boolean;
  reset: number;
  onInteract: () => void;
  children?: ReactNode;
  rigs?: V3[];
};
const GOLD = '#efc27d';
const CYAN = '#73dcd9';
const BLUE = '#689bff';
const PINK = '#ed9987';

export function Ring({ radius, y = 0, tube = 0.025, color = GOLD, metal = false }: {
  radius: number; y?: number; tube?: number; color?: string; metal?: boolean;
}) {
  return <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
    <torusGeometry args={[radius, tube, 8, 80]} />
    {metal ? <meshStandardMaterial color={color} metalness={0.85} roughness={0.26} />
      : <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />}
  </mesh>;
}

export function Label({ at, children, color = GOLD }: { at: V3; children: ReactNode; color?: string }) {
  return <Html position={at} center className="journey-world-label" style={{ color }} zIndexRange={[4, 0]}>
    {children}
  </Html>;
}

/** Visible-light paths are a false-colour illustration; these are not photon trajectories. */
export function Beam({ start, end, color = GOLD, radius = 0.025 }: { start: V3; end: V3; color?: string; radius?: number }) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return <group position={a.add(b).multiplyScalar(0.5)} quaternion={q}>
    {[1, 3.8].map((k) => <mesh key={k}>
      <cylinderGeometry args={[radius * k, radius * k, new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end)), 12, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={k === 1 ? 0.68 : 0.055} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>)}
  </group>;
}

export function Glow({ radius = 0.4, color = GOLD }: { radius?: number; color?: string }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 p = modelViewMatrix * vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
    fragmentShader: 'uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.8); gl_FragColor=vec4(tint,0.045+rim*0.38);}',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh material={material}><sphereGeometry args={[radius, 40, 32]} /></mesh>;
}

/** A seeded luminous cloud is a visual marker for an atom, not an electron-orbit model. */
export function Atom({ position = [0, 0, 0], radius = 0.32, color = GOLD, cloud = true }: {
  position?: V3; radius?: number; color?: string; cloud?: boolean;
}) {
  const dots = useMemo(() => {
    let seed = 5281;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed + 1) / 4294967297; };
    const p = new Float32Array(720 * 3);
    for (let i = 0; i < p.length; i += 3) {
      const r = Math.sqrt(-2 * Math.log(rand())) * radius * 0.34;
      const theta = rand() * 2 * Math.PI;
      const z = rand() * 2 - 1;
      p[i] = r * Math.sqrt(1 - z * z) * Math.cos(theta);
      p[i + 1] = r * z;
      p[i + 2] = r * Math.sqrt(1 - z * z) * Math.sin(theta);
    }
    return p;
  }, [radius]);
  return <group position={position}>
    <mesh><sphereGeometry args={[radius * 0.17, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <Glow radius={radius} color={color} />
    {cloud && <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[dots, 3]} /></bufferGeometry>
      <pointsMaterial color={color} size={0.013} transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>}
  </group>;
}

export function Trap({ at, large = false }: { at: V3; large?: boolean }) {
  // Authored hourglass shape: arbitrary drawing units, explicitly not a calibrated beam model.
  const profile = useMemo(() => Array.from({ length: 41 }, (_, i) => {
    const y = (i / 40 - 0.5) * (large ? 5 : 2.7);
    return new THREE.Vector2((large ? 0.1 : 0.036) * Math.sqrt(1 + (y / (large ? 0.28 : 0.23)) ** 2), y);
  }), [large]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(GOLD) }, halfLength: { value: large ? 2.5 : 1.35 }, strength: { value: large ? 0.075 : 0.04 } },
    vertexShader: `varying float height; varying vec3 n; varying vec3 v;
      void main(){height=position.y; vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 tint; uniform float halfLength; uniform float strength; varying float height; varying vec3 n; varying vec3 v;
      void main(){float facing=pow(abs(dot(normalize(n),normalize(v))),1.3);
        float ends=1.-smoothstep(halfLength*.5,halfLength,abs(height));
        float focus=.38+.62/(1.+height*height*3.);
        gl_FragColor=vec4(tint*1.4, strength*facing*ends*focus);}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }), [large]);
  useEffect(() => () => material.dispose(), [material]);
  return <group position={at}>
    {[1, 0.63, 0.32].map((scale) => <mesh key={scale} material={material} scale={[scale, 1, scale]}><latheGeometry args={[profile, 40]} /></mesh>)}
    <Ring radius={large ? 0.28 : 0.065} tube={large ? 0.012 : 0.006} />
  </group>;
}

function Objective({ position, flip = false }: { position: V3; flip?: boolean }) {
  const profile = useMemo(() => [
    [0.57, -1.12], [0.68, -1.10], [0.69, -0.79], [0.92, -0.48], [0.96, -0.36],
    [0.96, 0.25], [1.06, 0.29], [1.06, 0.64], [0.98, 0.68], [0.98, 1.03], [0.6, 1.03],
    [0.6, -1.12],
  ].map(([r, y]) => new THREE.Vector2(r!, y!)), []);
  return <group position={position} rotation={flip ? [Math.PI, 0, 0] : [0, 0, 0]}>
    <mesh><latheGeometry args={[profile, 80]} /><meshStandardMaterial color="#303e48" metalness={0.92} roughness={0.25} /></mesh>
    {[-0.74, -0.43, 0.24, 0.34, 0.62, 0.86, 0.99].map((y, i) => <Ring key={y} radius={i < 2 ? 0.75 + i * 0.18 : 1.015} y={y} tube={0.021} metal color={i === 3 ? '#c9a35f' : '#9ca8af'} />)}
    {Array.from({ length: 48 }, (_, i) => {
      const a = i * Math.PI / 24;
      return <mesh key={i} position={[Math.cos(a) * 1.065, 0.46, Math.sin(a) * 1.065]} rotation={[0, -a, 0]}>
        <boxGeometry args={[0.018, 0.21, 0.023]} /><meshStandardMaterial color="#86949a" metalness={0.85} roughness={0.35} />
      </mesh>;
    })}
    <mesh position={[0, -1.10, 0]} scale={[1, 0.22, 1]}><sphereGeometry args={[0.58, 48, 24]} />
      <meshPhysicalMaterial color="#368b98" metalness={0.32} roughness={0.06} transparent opacity={0.8} clearcoat={1} />
    </mesh>
    <Ring radius={0.59} y={-1.115} tube={0.016} color={CYAN} />
  </group>;
}

function Deck() {
  const holes = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!holes.current) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (let x = -5.4; x <= 5.4; x += 0.6) for (let z = -3.6; z <= 3.6; z += 0.6) {
      o.position.set(x, -2.07, z); o.rotation.x = -Math.PI / 2; o.updateMatrix();
      holes.current.setMatrixAt(i++, o.matrix);
    }
    holes.current.count = i;
    holes.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <group>
    <RoundedBox args={[11.4, 0.5, 8.4]} radius={0.16} position={[0, -2.34, 0]} smoothness={4}>
      <meshStandardMaterial color="#24333b" metalness={0.75} roughness={0.35} />
    </RoundedBox>
    <instancedMesh ref={holes} args={[undefined, undefined, 400]}>
      <circleGeometry args={[0.038, 8]} /><meshBasicMaterial color="#080f17" />
    </instancedMesh>
    {[-2.2, 2.2].flatMap((x) => [-1.75, 1.75].map((z) => <group key={`${x}${z}`} position={[x, -1.2, z]}>
      <mesh><cylinderGeometry args={[0.11, 0.13, 1.75, 16]} /><meshStandardMaterial color="#a1b0b5" metalness={0.93} roughness={0.19} /></mesh>
      <mesh position={[0, -0.73, 0]}><cylinderGeometry args={[0.22, 0.22, 0.25, 16]} /><meshStandardMaterial color="#273139" metalness={0.8} roughness={0.23} /></mesh>
    </group>))}
  </group>;
}

export function Apparatus({ chapter, spacing: trapSpacing }: { chapter: number; spacing: number }) {
  const close = chapter === 1;
  return <group>
    {!close && <>
      <Deck />
      <Objective position={[0, 2.5, 0]} />
      {[-2.2, 2.2].map((x) => <group key={x}>
        <mesh position={[x, 0.6, -1.75]}><cylinderGeometry args={[0.09, 0.09, 5.4, 20]} /><meshStandardMaterial color="#91a7ac" metalness={0.92} roughness={0.2} /></mesh>
        <RoundedBox args={[0.35, 0.22, 2.3]} radius={0.03} position={[x, 3.13, -0.85]}><meshStandardMaterial color="#455965" metalness={0.82} roughness={0.3} /></RoundedBox>
        <mesh position={[x, 3.28, -1.75]}><cylinderGeometry args={[0.17, 0.17, 0.08, 6]} /><meshStandardMaterial color="#c7c7b7" metalness={0.8} roughness={0.22} /></mesh>
        <RoundedBox args={[1.2, 0.18, 0.34]} radius={0.02} position={[Math.sign(x) * 1.63, 3.13, 0]}><meshStandardMaterial color="#455965" metalness={0.82} roughness={0.3} /></RoundedBox>
      </group>)}
      <group position={[0, -0.05, 0]}>
        <mesh><boxGeometry args={[4.2, 1.2, 3.2]} /><meshPhysicalMaterial color="#90cacc" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} roughness={0.1} /></mesh>
        <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(4.2, 1.2, 3.2)]} /><lineBasicMaterial color="#779a9f" transparent opacity={0.35} /></lineSegments>
      </group>
      {[-0.8, 0.85].map((y) => <group key={y}>
        {[0, 0.07, 0.14].map((offset) => <Ring key={offset} radius={2.05 + offset} y={y} tube={0.044} color="#ac694c" metal />)}
      </group>)}
      <group position={[-4.1, -1.45, 0]}>
        <RoundedBox args={[1.8, 1.1, 1.1]} radius={0.06}><meshStandardMaterial color="#324653" metalness={0.8} roughness={0.27} /></RoundedBox>
        <mesh position={[0.915, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.25, 0.25, 0.18, 24]} /><meshStandardMaterial color="#b3b7ac" metalness={0.9} roughness={0.15} /></mesh>
      </group>
      <Beam start={[-3.15, -1.45, 0]} end={[0, -1.45, 0]} />
      <Beam start={[0, -1.45, 0]} end={[0, 0, 0]} radius={0.055} />
      <Beam start={[5, 0.12, -0.6]} end={[-3, 0.12, -0.6]} color={BLUE} radius={0.025} />
      <Beam start={[-4, 0.12, 0.6]} end={[3, 0.12, 0.6]} color={PINK} radius={0.025} />
      <Label at={[1.65, 3.55, 0]}>FOCUS THE LIGHT</Label>
      <Label at={[2.25, 0, 1.7]} color={CYAN}>ATOMS, HELD IN VACUUM</Label>
      <Label at={[-3.9, -0.65, 0]}>LASER CONTROL</Label>
    </>}
    {Array.from({ length: close ? 9 : 64 }, (_, i) => {
      const side = close ? 3 : 8;
      const spacing = close ? trapSpacing : 0.30;
      const at: V3 = [((i % side) - (side - 1) / 2) * spacing, 0, (Math.floor(i / side) - (side - 1) / 2) * spacing];
      return <group key={i}>
        <Trap at={at} large={close} />
        <Atom position={at} radius={close ? 0.27 : 0.075} cloud={close} />
      </group>;
    })}
    {close && <>
      <Label at={[0, -0.65, 0]} color={CYAN}>ONE ATOM · ONE QUBIT</Label>
      <Label at={[2, 2.15, 0]}>A POCKET MADE OF LIGHT</Label>
      <Line points={[[1.6, 1.8, 0], [2, 2, 0]]} color={GOLD} lineWidth={1} />
      <gridHelper args={[12, 24, '#26464b', '#122a33']} position={[0, -2.7, 0]} />
    </>}
  </group>;
}

function Bloch({ angle }: { angle: number }) {
  const radius = 1.9;
  const [x, y, z] = blochFromAngles(angle, 0);
  const point: V3 = [x * radius, z * radius, -y * radius];
  return <group>
    <Glow radius={radius} color={CYAN} />
    {[0, Math.PI / 2].map((rot) => <group key={rot} rotation={[rot, 0, 0]}><Ring radius={radius} color={CYAN} tube={0.009} /></group>)}
    <group rotation={[0, 0, Math.PI / 2]}><Ring radius={radius} color={CYAN} tube={0.009} /></group>
    {[-1.25, -0.65, 0.65, 1.25].map((h) => <Ring key={h} radius={Math.sqrt(radius ** 2 - h ** 2)} y={h} color="#47787c" tube={0.004} />)}
    <Line points={[[0, -2.3, 0], [0, 2.3, 0]]} color="#426771" lineWidth={1} />
    <Line points={[[0, 0, 0], point]} color={GOLD} lineWidth={3} />
    <Atom radius={0.25} />
    <Atom position={point} radius={0.15} color={CYAN} />
    <Label at={[0, 2.45, 0]}>0</Label>
    <Label at={[0, -2.5, 0]}>1</Label>
    <Label at={[2.9, 0.1, 0]} color={CYAN}>THE QUBIT’S STATE</Label>
    <Trap at={[0, 0, 0]} />
  </group>;
}

function Waves({ phase, reducedMotion }: { phase: number; reducedMotion: boolean }) {
  const ribbons = useMemo(() => [0, 1, 2].map(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(161 * 2 * 3);
    const indices: number[] = [];
    for (let i = 0; i < 160; i++) indices.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); g.setIndex(indices);
    return g;
  }), []);
  useEffect(() => () => ribbons.forEach((g) => g.dispose()), [ribbons]);
  useFrame(({ clock }) => {
    const time = reducedMotion ? 0 : clock.elapsedTime * 1.2;
    ribbons.forEach((g, index) => {
      const a = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= 160; i++) {
        const x = i / 160 * 7 - 3.5;
        const base = x * 2.8 - time;
        const y = index === 2 ? (Math.sin(base) + Math.sin(base + phase)) * 0.38 : Math.sin(base + (index === 1 ? phase : 0)) * 0.6;
        a.setXYZ(i * 2, x, y + (1 - index) * 1.65 - 0.016, 0);
        a.setXYZ(i * 2 + 1, x, y + (1 - index) * 1.65 + 0.016, 0);
      }
      a.needsUpdate = true;
      g.computeBoundingSphere();
    });
  });
  return <group>
    {ribbons.map((geometry, i) => <mesh key={i} geometry={geometry}>
      <meshBasicMaterial color={[GOLD, CYAN, '#eee3cf'][i]!} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>)}
    {[1.65, 0, -1.65].map((y) => <Line key={y} points={[[-3.6, y, -0.05], [3.6, y, -0.05]]} color="#28444d" lineWidth={1} />)}
    <Label at={[-3.1, 2.55, 0]}>AMPLITUDE FROM 0</Label>
    <Label at={[-3.1, 0.9, 0]} color={CYAN}>AMPLITUDE FROM 1</Label>
    <Label at={[-2.8, -2.55, 0]} color="#eee3cf">ADD THEM → CHANCE OF 0</Label>
  </group>;
}

function Pair({ entangled, outcome, readout, reducedMotion }: { entangled: boolean; outcome: number | null; readout: boolean; reducedMotion: boolean }) {
  const shells = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (shells.current) {
      const s = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 1.8) * 0.025;
      shells.current.scale.setScalar(s);
    }
  });
  return <group>
    {[-1.25, 1.25].map((x, i) => {
      const bit = outcome === null ? null : i === 0 ? outcome >> 1 : outcome & 1;
      const z = readout && bit !== null ? (bit === 1 ? 0.65 : -0.65) : 0;
      return <group key={x}>
        <Trap at={[x, 0, z]} large />
        <Atom position={[x, 0, z]} radius={0.40} color={i === 0 ? GOLD : CYAN} />
        <Label at={[x, 2.7, 0]} color={i === 0 ? GOLD : CYAN}>ATOM {i === 0 ? 'A' : 'B'}</Label>
        {readout && [-0.65, 0.65].map((slot, b) => <group key={slot} position={[x, -0.09, slot]}>
          <Ring radius={0.28} color={b === bit ? '#f0f3de' : '#3c6573'} tube={0.012} />
          <Label at={[0.55, 0, 0]} color={b === bit ? '#f0f3de' : '#64828d'}>{b}</Label>
        </group>)}
      </group>;
    })}
    {!readout && entangled && <group ref={shells}>
      {[-1.25, 1.25].map((x) => <group key={x} position={[x, 0, 0]}>
        <Glow radius={1.55} color="#9997fa" />
        <group rotation={[0.4, 0, 0.3]}><Ring radius={1.55} tube={0.008} color="#9997fa" /></group>
      </group>)}
      <Beam start={[-4.5, 0.12, 0]} end={[4.5, 0.12, 0]} color={BLUE} />
      <Beam start={[4.5, -0.12, 0]} end={[-4.5, -0.12, 0]} color={PINK} />
    </group>}
    {!readout && <Label at={[0, -2.7, 0]} color="#aba8fb">{entangled ? 'INTERACTION CHANGES THE JOINT STATE' : 'GATE BYPASSED · INDEPENDENT ATOMS'}</Label>}
    {readout && <Label at={[0, -2.1, 0]} color={CYAN}>{outcome === null ? 'READY TO PREPARE & MEASURE' : `CAMERA RESULT   ${outcome.toString(2).padStart(2, '0')}`}</Label>}
  </group>;
}

function Protection({ error }: { error: number | null }) {
  return <group>
    {[-2.4, 0, 2.4].map((x, i) => <group key={i}>
      <Atom position={[x, 0, 0]} radius={0.58} color={error === i ? PINK : CYAN} />
      <Trap at={[x, 0, 0]} />
      <Label at={[x, -1.1, 0]} color={error === i ? PINK : CYAN}>{`ATOM ${'ABC'[i]}${error === i ? ' · FLIPPED' : ''}`}</Label>
    </group>)}
    {[0, 1].map((i) => {
      const changed = error === i || error === i + 1;
      const x = i === 0 ? -1.2 : 1.2;
      return <group key={i}>
        <Line points={[[x - 1.2, 0.3, 0], [x, 1.4, 0], [x + 1.2, 0.3, 0]]} color={changed ? PINK : '#477b83'} lineWidth={2} />
        <Label at={[x, 1.8, 0]} color={changed ? PINK : CYAN}>{changed ? 'DIFFERENT' : 'SAME'}</Label>
      </group>;
    })}
    <Ring radius={4} y={-1.9} color="#335861" tube={0.01} />
    <Label at={[0, -2.5, 0]} color={GOLD}>ONE LOGICAL QUBIT · SHARED ACROSS THE GROUP</Label>
  </group>;
}

const RIGS: V3[] = [[10.3, 7.5, 12.4], [7, 4.5, 8], [4.4, 2.6, 8.4], [0.8, 1.2, 11.4], [3.5, 3.3, 10.3], [3.8, 5, 9.8], [1.4, 3.2, 11.5]];
function CameraRig({ chapter, reducedMotion, reset, position }: Pick<SceneProps, 'chapter' | 'reducedMotion' | 'reset'> & { position: V3 }) {
  const { camera, controls, size } = useThree();
  const moving = useRef(true);
  const goal = useMemo(() => new THREE.Vector3(...position).multiplyScalar(size.width / size.height < 1 ? 1.25 : 1), [position, size.width, size.height]);
  useEffect(() => { moving.current = true; }, [goal, reset]);
  useEffect(() => {
    const c = controls as unknown as { addEventListener: (type: 'start', listener: () => void) => void; removeEventListener: (type: 'start', listener: () => void) => void } | null;
    const stop = () => { moving.current = false; };
    c?.addEventListener('start', stop);
    return () => c?.removeEventListener('start', stop);
  }, [controls]);
  useFrame((_, dt) => {
    if (!moving.current) return;
    const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (!orbit) return;
    const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 4);
    camera.position.lerp(goal, k);
    orbit.target.lerp(new THREE.Vector3(0, chapter === 0 ? 0.35 : 0, 0), k);
    orbit.update();
    if (camera.position.distanceTo(goal) < 0.003) moving.current = false;
  });
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="journey-fallback">The interactive 3D view needs WebGL.<br />You can still use every experiment and read the guide.</div> : this.props.children; }
}

export default function JourneyScene(props: SceneProps) {
  const visible = usePageVisible();
  const [contextLost, setContextLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  return <SceneBoundary>
    {contextLost && <div className="journey-context-message" role="status">The 3D view was interrupted.<button onClick={() => { setGeneration((g) => g + 1); setContextLost(false); }}>Reload the 3D view</button></div>}
    <Canvas key={generation} dpr={[1, 1.6]} frameloop={visible && !contextLost ? 'always' : 'never'} camera={{ fov: 39, position: RIGS[0]!, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}
      fallback={<div className="journey-fallback">3D is unavailable on this device. The experiments below still work.</div>}>
      <ContextMonitor onChange={setContextLost} />
      <ambientLight intensity={0.5} color="#789cac" />
      <directionalLight position={[4, 7, 3]} intensity={2.5} color="#e5d8ba" />
      <pointLight position={[-4, 2, 0]} intensity={35} color={CYAN} />
      <pointLight position={[3, 0, -4]} intensity={25} color="#779dd4" />
      <Suspense fallback={null}>
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 5, 1]} />
          <Lightformer form="rect" intensity={2} color="#8bd5e7" position={[-5, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[3, 8, 1]} />
          <Lightformer form="rect" intensity={4} color="#f7d19b" position={[4, 3, -3]} rotation={[0, -Math.PI / 3, 0]} scale={[2, 7, 1]} />
        </Environment>
        {props.children ?? <>
          {props.chapter < 2 && <Apparatus chapter={props.chapter} spacing={props.spacing} />}
          {props.chapter === 2 && <Bloch angle={props.angle} />}
          {props.chapter === 3 && <Waves phase={props.phase} reducedMotion={props.reducedMotion} />}
          {(props.chapter === 4 || props.chapter === 5) && <Pair entangled={props.entangled} outcome={props.outcome} readout={props.chapter === 5} reducedMotion={props.reducedMotion} />}
          {props.chapter === 6 && <Protection error={props.error} />}
        </>}
      </Suspense>
      <OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={0.12} maxPolarAngle={Math.PI * 0.78} onStart={props.onInteract} />
      <CameraRig chapter={props.chapter} reducedMotion={props.reducedMotion} reset={props.reset} position={props.rigs?.[props.chapter] ?? RIGS[props.chapter]!} />
      <EffectComposer multisampling={0}><Bloom intensity={0.7} luminanceThreshold={0.75} mipmapBlur /></EffectComposer>
    </Canvas>
  </SceneBoundary>;
}

function ContextMonitor({ onChange }: { onChange: (lost: boolean) => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onChange(true); };
    const restored = () => onChange(false);
    gl.domElement.addEventListener('webglcontextlost', lost);
    gl.domElement.addEventListener('webglcontextrestored', restored);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      gl.domElement.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, onChange]);
  return null;
}

function usePageVisible(): boolean {
  // Avoid spending GPU time when the tab is hidden. The root unmounts on route changes.
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  return visible;
}
