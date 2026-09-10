/**
 * Table-scale optical hardware for the instrument view: boxes that glow when their
 * instrument is active, glass, mirrors, modulators, coils, beams between components and
 * the cables that drive them. Everything reads one shared `ActivityRef` each frame.
 */
import { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Activity, Instrument } from '../data/program.ts';
import { Callout } from './Callout.tsx';
import { OpticalPost, Screw } from './LabHardware.tsx';
import { InstrumentFocus } from './InstrumentFocus.ts';

export type ActivityRef = { current: Activity };
export type V3 = readonly [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export function quatFromTo(from: THREE.Vector3, to: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());
}

function edgesOf(w: number, h: number, d: number): THREE.EdgesGeometry {
  return new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
}

/* ------------------------------------------------------------------------------------------ */
/* A box instrument: laser head, AWG, camera, computer... glows with its activity.             */
/* ------------------------------------------------------------------------------------------ */

export function Device({
  position,
  size,
  color,
  id,
  activity,
  label,
  labelOffset = [0, 0.35, 0],
  rotationY = 0,
  glowScale = 1,
  labelWithin = 40,
  hollow = false,
}: {
  position: V3;
  size: V3;
  color: string;
  id?: Instrument;
  activity: ActivityRef;
  label?: string;
  labelOffset?: V3;
  rotationY?: number;
  glowScale?: number;
  /** camera distance beyond which the label fades out */
  labelWithin?: number;
  /** draw only the edges (a rack or enclosure whose contents should stay visible) */
  hollow?: boolean;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const edges = useMemo(() => edgesOf(...size), [size]);
  const emissive = useMemo(() => new THREE.Color(color), [color]);
  useFrame(() => {
    const m = matRef.current;
    if (m === null) return;
    const a = id === undefined ? 0 : activity.current[id];
    m.emissiveIntensity = (0.015 + 0.18 * a) * glowScale;
  });
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]} userData={{ instrument: id }}>
      {hollow ? null : (
        <RoundedBox args={[...size]} radius={Math.min(...size) * 0.07} smoothness={2}>
          <meshStandardMaterial ref={matRef} color="#323e49" metalness={0.7} roughness={0.3} emissive={emissive} emissiveIntensity={0.04} />
        </RoundedBox>
      )}
      {!hollow && <>
        <mesh position={[0, 0, size[2] / 2 + 0.006]}><boxGeometry args={[size[0] * 0.92, size[1] * 0.78, 0.014]} /><meshStandardMaterial color="#111a23" metalness={0.55} roughness={0.35} /></mesh>
        {[-1, 1].flatMap(x => [-1, 1].map(y => <Screw key={`${x}/${y}`} at={[x * size[0] * 0.4, y * size[1] * 0.32, size[2] / 2 + 0.02]} radius={0.018} />))}
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[(i - 2.5) * size[0] * 0.1, size[1] / 2 + 0.002, 0]}><boxGeometry args={[size[0] * 0.025, 0.005, size[2] * 0.58]} /><meshBasicMaterial color="#0a1219" /></mesh>)}
        <mesh position={[-size[0] * 0.23, 0, size[2] / 2 + 0.018]}><planeGeometry args={[size[0] * 0.27, size[1] * 0.32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} /></mesh>
        <mesh position={[size[0] * 0.23, 0, size[2] / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[size[1] * 0.12, size[1] * 0.12, 0.055, 20]} /><meshStandardMaterial color="#8495a1" metalness={0.9} roughness={0.25} /></mesh>
      </>}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={0.45} />
      </lineSegments>
      {label !== undefined ? (
        <Callout position={[labelOffset[0], size[1] / 2 + labelOffset[1], labelOffset[2]]} fixed showWithin={labelWithin}>
          {label}
        </Callout>
      ) : null}
    </group>
  );
}

/** Small glowing indicator (laser aperture, LED) on a device face. */
export function Indicator({ position, color, id, activity, radius = 0.05 }: { position: V3; color: string; id: Instrument; activity: ActivityRef; radius?: number }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const c = useMemo(() => new THREE.Color(color), [color]);
  useFrame(() => {
    const m = matRef.current;
    if (m === null) return;
    const a = activity.current[id];
    m.color.copy(c).multiplyScalar(0.15 + 1.6 * a);
  });
  return (
    <mesh position={[...position]}>
      <sphereGeometry args={[radius, 12, 12]} />
      <meshBasicMaterial ref={matRef} color={color} toneMapped={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Passive optics                                                                             */
/* ------------------------------------------------------------------------------------------ */

const GLASS = { color: '#9fd3ff', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false } as const;

/** Thin lens: a disc whose axis points along `axis`. */
export function Lens({ position, axis, radius = 0.28 }: { position: V3; axis: V3; radius?: number }) {
  const q = useMemo(() => quatFromTo(UP, new THREE.Vector3(...axis)), [axis]);
  return (
    <>{!(position[0] === 0 && position[2] === 0) && <OpticalPost position={position} top={position[1] - radius} />}<group position={[...position]} quaternion={q}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.05, 32]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius + 0.025, 0.048, 12, 48]} />
        <meshStandardMaterial color="#2a2f36" metalness={0.7} roughness={0.35} />
      </mesh>
      {[-0.04, 0.04].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius + 0.028, 0.012, 8, 48]} /><meshStandardMaterial color="#71818d" metalness={0.88} roughness={0.2} /></mesh>)}
    </group></>
  );
}

/** Flat plate (mirror, dichroic, waveplate, knife-edge) whose face normal is `normal`. */
export function Plate({
  position,
  normal,
  size = [0.42, 0.42],
  color = '#c8d4e0',
  opacity = 1,
  thickness = 0.03,
  label,
}: {
  position: V3;
  normal: V3;
  size?: readonly [number, number];
  color?: string;
  opacity?: number;
  thickness?: number;
  label?: string;
}) {
  const q = useMemo(() => quatFromTo(Z, new THREE.Vector3(...normal)), [normal]);
  return (
    <>{!(position[0] === 0 && position[2] === 0) && <OpticalPost position={position} />}<group position={[...position]} quaternion={q}>
      <RoundedBox args={[size[0] + 0.12, size[1] + 0.12, 0.065]} radius={0.018} position={[0, 0, -0.055]}><meshStandardMaterial color="#222e38" metalness={0.75} roughness={0.3} /></RoundedBox>
      {[-1, 1].map(x => <Screw key={x} at={[x * (size[0] / 2 + 0.025), size[1] / 2 + 0.025, 0]} radius={0.02} />)}
      <mesh>
        <boxGeometry args={[size[0], size[1], thickness]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
      </mesh>
      {label !== undefined ? (
        <Callout position={[0, size[1] / 2 + 0.22, 0]} fixed small showWithin={12}>
          {label}
        </Callout>
      ) : null}
    </group></>
  );
}

/** Polarizing beam-splitter cube with its diagonal coating drawn. */
export function Cube({ position, size = 0.34, label }: { position: V3; size?: number; label?: string }) {
  return (
    <group position={[...position]}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial {...GLASS} opacity={0.22} />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[size * 1.38, size * 0.96, 0.01]} />
        <meshStandardMaterial color="#8fb4d8" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {label !== undefined ? (
        <Callout position={[0, size / 2 + 0.22, 0]} fixed small showWithin={12}>
          {label}
        </Callout>
      ) : null}
    </group>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Active optics: acousto-optic deflector crystal with an RF sound wave, and an SLM hologram.  */
/* ------------------------------------------------------------------------------------------ */

const STRIPE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uGain;
  varying vec3 vLocal;
  void main() {
    // acoustic grating travelling along local y (the transducer axis)
    float w = 0.5 + 0.5 * sin(60.0 * vLocal.y - 14.0 * uTime);
    vec3 base = vec3(0.32, 0.40, 0.50);
    vec3 c = mix(base, uColor, uGain * w);
    gl_FragColor = vec4(c, 0.75);
  }
`;
const LOCAL_VERT = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function AODCrystal({
  position,
  beamAxis,
  id,
  activity,
  color = '#5ec8e5',
  label,
  roll = 0,
}: {
  position: V3;
  /** direction the light travels through the crystal */
  beamAxis: V3;
  id: Instrument;
  activity: ActivityRef;
  color?: string;
  label?: string;
  /** rotation about the beam axis; the second AOD of a crossed pair uses π/2 */
  roll?: number;
}) {
  const q = useMemo(() => {
    const align = quatFromTo(Z, new THREE.Vector3(...beamAxis));
    const spin = new THREE.Quaternion().setFromAxisAngle(Z, roll);
    return align.multiply(spin);
  }, [beamAxis, roll]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: LOCAL_VERT,
        fragmentShader: STRIPE_FRAG,
        uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uGain: { value: 0 } },
        transparent: true,
      }),
    [color],
  );
  useFrame((state) => {
    material.uniforms.uTime!.value = state.clock.elapsedTime;
    material.uniforms.uGain!.value = activity.current[id];
  });
  return (
    <group position={[...position]} quaternion={q} userData={{ instrument: id }}>
      <mesh material={material}>
        <boxGeometry args={[0.3, 0.3, 0.16]} />
      </mesh>
      {/* transducer */}
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.24, 0.06, 0.14]} />
        <meshStandardMaterial color="#7a5a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      {label !== undefined ? (
        <Callout position={[0, 0.4, 0]} fixed showWithin={18}>
          {label}
        </Callout>
      ) : null}
    </group>
  );
}

export function SLMPanel({ position, normal, id, activity, label }: { position: V3; normal: V3; id: Instrument; activity: ActivityRef; label?: string }) {
  const q = useMemo(() => quatFromTo(Z, new THREE.Vector3(...normal)), [normal]);
  const texture = useMemo(() => {
    const n = 64;
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    const ctx = c.getContext('2d')!;
    // a phase hologram: pseudo-random phase in [0, 2π), shown as hue
    let s = 7;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const ph = (rnd() + 0.15 * Math.sin(x * 0.6) + 0.15 * Math.cos(y * 0.45)) % 1;
        ctx.fillStyle = `hsl(${Math.floor(ph * 360)}, 55%, ${28 + Math.floor(ph * 22)}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
  }, []);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = matRef.current;
    if (m === null) return;
    m.emissiveIntensity = 0.1 + 0.9 * activity.current[id];
  });
  return (
    <group position={[...position]} quaternion={q} userData={{ instrument: id }}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[0.9, 0.7, 0.08]} />
        <meshStandardMaterial color="#12161c" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.7, 0.5]} />
        <meshStandardMaterial ref={matRef} map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.1} roughness={0.2} metalness={0.3} />
      </mesh>
      {label !== undefined ? (
        <Callout position={[0, 0.55, 0]} fixed showWithin={18}>
          {label}
        </Callout>
      ) : null}
    </group>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Coils and the vacuum cell                                                                  */
/* ------------------------------------------------------------------------------------------ */

export function Coil({ position, radius, axis, id, activity, tube = 0.06, label }: { position: V3; radius: number; axis: V3; id: Instrument; activity: ActivityRef; tube?: number; label?: string }) {
  const q = useMemo(() => quatFromTo(Z, new THREE.Vector3(...axis)), [axis]);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = matRef.current;
    if (m === null) return;
    m.emissiveIntensity = 0.02 + 0.35 * activity.current[id];
  });
  return (
    <group position={[...position]} quaternion={q}>
      <mesh>
        <torusGeometry args={[radius, tube, 12, 72]} />
        <meshStandardMaterial ref={matRef} color="#8a5a30" metalness={0.8} roughness={0.35} emissive="#ff8a3d" emissiveIntensity={0.02} />
      </mesh>
      {[-2, -1, 1, 2].map(i => <mesh key={i} position={[0, 0, i * tube * 0.7]}>
        <torusGeometry args={[radius, tube * 0.42, 8, 72]} />
        <meshStandardMaterial color="#ad6b3d" metalness={0.86} roughness={0.25} />
      </mesh>)}
      {label !== undefined ? (
        <Callout position={[radius + 0.1, 0.15, 0]} fixed small showWithin={14}>
          {label}
        </Callout>
      ) : null}
    </group>
  );
}

export function GlassCell({ position, size }: { position: V3; size: V3 }) {
  const edges = useMemo(() => edgesOf(...size), [size]);
  return (
    <group position={[...position]}>
      <mesh>
        <boxGeometry args={[...size]} />
        <meshPhysicalMaterial color="#cfe6ff" transparent opacity={0.08} roughness={0.05} metalness={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#9fd3ff" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Beams between components: a polyline of glowing cylinders with travelling phase fronts.   */
/* ------------------------------------------------------------------------------------------ */

const BEAM_VERT = /* glsl */ `
  varying vec3 vLocal;
  varying float vRim;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec3 v = normalize(-mv.xyz);
    vRim = 1.0 - abs(dot(n, v));
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uGain;
  uniform float uOpacity;
  uniform float uK;
  uniform float uSpeed;
  uniform float uHalfLen;
  uniform float uRimPow;
  uniform int uMode; // 1 travelling, 2 standing
  varying vec3 vLocal;
  varying float vRim;
  void main() {
    float y = vLocal.y;
    float fronts = 1.0;
    if (uMode == 1) fronts = 0.6 + 0.4 * sin(uK * y - uSpeed * uTime);
    if (uMode == 2) fronts = 0.4 + 0.6 * pow(cos(uK * y), 2.0);
    float endFade = 1.0 - smoothstep(0.85, 1.0, abs(y) / uHalfLen);
    float rim = mix(1.0, pow(vRim, uRimPow), step(0.5, uRimPow));
    gl_FragColor = vec4(uColor, uOpacity * uGain * fronts * endFade * rim);
  }
`;

function makeBeamMaterial(color: string, opacity: number, k: number, speed: number, mode: number, rimPow: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uGain: { value: 0 },
      uOpacity: { value: opacity },
      uK: { value: k },
      uSpeed: { value: speed },
      uHalfLen: { value: 1 },
      uRimPow: { value: rimPow },
      uMode: { value: mode },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export type BeamPathProps = {
  points: readonly V3[];
  color: string;
  /** Instrument(s) whose activity gates the beam; the minimum is used so a beam needs its whole chain on. */
  gate: readonly Instrument[];
  activity: ActivityRef;
  radius?: number;
  /** Optional per-vertex radius (same length as points) for expanding/focusing beams. */
  radii?: readonly number[];
  opacity?: number;
  k?: number;
  speed?: number;
  mode?: 1 | 2;
  /** Extra 0..1 multiplier read every frame (e.g. a 50/50 split). */
  scale?: number;
};

export function BeamPath({ points, color, gate, activity, radius = 0.035, radii, opacity = 0.85, k = 12, speed = 18, mode = 1, scale = 1 }: BeamPathProps) {
  const focus = useContext(InstrumentFocus);
  const segs = useMemo(() => {
    const out: { mid: THREE.Vector3; q: THREE.Quaternion; len: number; r0: number; r1: number }[] = [];
    for (let i = 0; i + 1 < points.length; i += 1) {
      const a = new THREE.Vector3(...points[i]!);
      const b = new THREE.Vector3(...points[i + 1]!);
      const d = b.clone().sub(a);
      out.push({
        mid: a.clone().add(b).multiplyScalar(0.5),
        q: quatFromTo(UP, d),
        len: d.length(),
        r0: radii?.[i] ?? radius,
        r1: radii?.[i + 1] ?? radius,
      });
    }
    return out;
  }, [points, radius, radii]);
  const materials = useMemo(
    () =>
      segs.map((s) => {
        const core = makeBeamMaterial(color, opacity, k, speed, mode, 0);
        const halo = makeBeamMaterial(color, opacity * 0.22, k, speed, mode, 1.8);
        core.uniforms.uHalfLen!.value = s.len / 2;
        halo.uniforms.uHalfLen!.value = s.len / 2;
        return { core, halo };
      }),
    [segs, color, opacity, k, speed, mode],
  );
  useFrame((state) => {
    let g = 1;
    for (const id of gate) g = Math.min(g, activity.current[id]);
    g *= scale * (focus === null || gate.some(id => focus.includes(id)) ? 1 : 0.08);
    for (const { core, halo } of materials) {
      core.uniforms.uTime!.value = state.clock.elapsedTime;
      core.uniforms.uGain!.value = g;
      halo.uniforms.uTime!.value = state.clock.elapsedTime;
      halo.uniforms.uGain!.value = g;
    }
  });
  return (
    <group>
      {segs.map((s, i) => (
        <group key={i} position={s.mid} quaternion={s.q}>
          <mesh material={materials[i]!.core}>
            <cylinderGeometry args={[s.r1, s.r0, s.len, 14, 1, true]} />
          </mesh>
          <mesh material={materials[i]!.halo}>
            <cylinderGeometry args={[s.r1 * 2.0, s.r0 * 2.0, s.len, 14, 1, true]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Converging or diverging cone of light (objective → atoms, atoms → objective). */
export function LightCone({ from, to, r0, r1, color, gate, activity, opacity = 0.35, scale = 1 }: { from: V3; to: V3; r0: number; r1: number; color: string; gate: readonly Instrument[]; activity: ActivityRef; opacity?: number; scale?: number }) {
  const focus = useContext(InstrumentFocus);
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);
  const d = useMemo(() => b.clone().sub(a), [a, b]);
  const q = useMemo(() => quatFromTo(UP, d), [d]);
  const mid = useMemo(() => a.clone().add(b).multiplyScalar(0.5), [a, b]);
  const material = useMemo(() => makeBeamMaterial(color, opacity, 0, 0, 0, 1.2), [color, opacity]);
  useFrame((state) => {
    let g = 1;
    for (const id of gate) g = Math.min(g, activity.current[id]);
    material.uniforms.uTime!.value = state.clock.elapsedTime;
    material.uniforms.uGain!.value = g * scale * (focus === null || gate.some(id => focus.includes(id)) ? 1 : 0.08);
    material.uniforms.uHalfLen!.value = d.length() / 2;
  });
  return (
    <mesh position={mid} quaternion={q} material={material}>
      <cylinderGeometry args={[r1, r0, d.length(), 28, 1, true]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Signal cables with pulses running along them while the source instrument is active.       */
/* ------------------------------------------------------------------------------------------ */

export function Cable({ points, id, activity, color = '#7d8b99', pulses = 3, speed = 1.4 }: { points: readonly V3[]; id: Instrument; activity: ActivityRef; color?: string; pulses?: number; speed?: number }) {
  const focus = useContext(InstrumentFocus);
  const emphasized = focus === null || focus.includes(id);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.0), [points]);
  const dots = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const linePts = useMemo(() => curve.getPoints(40).map((p) => [p.x, p.y, p.z] as [number, number, number]), [curve]);
  useFrame((state) => {
    const m = dots.current;
    if (m === null) return;
    const a = activity.current[id];
    for (let i = 0; i < pulses; i += 1) {
      const t = ((state.clock.elapsedTime * speed) / 2 + i / pulses) % 1;
      curve.getPointAt(t, tmp);
      dummy.position.copy(tmp);
      dummy.scale.setScalar(a > 0.05 && emphasized ? 0.5 + a : 0.0001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <Line points={linePts} color={color} lineWidth={1} transparent opacity={emphasized ? 0.55 : 0.05} />
      <instancedMesh ref={dots} args={[undefined, undefined, pulses]} frustumCulled={false}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
