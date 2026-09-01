import type { BenchElement } from '@optics/bench';
import { units } from '@optics/kernel';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Z_MAX, Z_MIN, labelForType } from '../catalog.ts';
import { BEAM_HEIGHT, opticX, worldXToZMetres } from '../scale.ts';

export function MountedOptics(props: {
  readonly elements: readonly BenchElement[];
  readonly zMin: number;
  readonly selectedId: string | null;
  readonly showLabels: boolean;
  readonly onSelect: (id: string) => void;
  readonly onMove: (id: string, zMetres: number) => void;
  readonly onDragState: (dragging: boolean) => void;
}) {
  return (
    <group>
      {props.elements.map((element) => (
        <DraggableMount
          key={element.id}
          element={element}
          zMin={props.zMin}
          selected={element.id === props.selectedId}
          showLabel={props.showLabels}
          onSelect={props.onSelect}
          onMove={props.onMove}
          onDragState={props.onDragState}
        />
      ))}
    </group>
  );
}

function DraggableMount(props: {
  readonly element: BenchElement;
  readonly zMin: number;
  readonly selected: boolean;
  readonly showLabel: boolean;
  readonly onSelect: (id: string) => void;
  readonly onMove: (id: string, zMetres: number) => void;
  readonly onDragState: (dragging: boolean) => void;
}) {
  const { gl } = useThree();
  const dragging = useRef(false);
  const x = opticX(units.toM(props.element.position), props.zMin);

  const applyHit = (pointX: number) => {
    const z = THREE.MathUtils.clamp(worldXToZMetres(pointX, props.zMin), Z_MIN, Z_MAX);
    props.onMove(props.element.id, z);
  };

  return (
    <group
      position={[x, 0, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        dragging.current = true;
        props.onSelect(props.element.id);
        props.onDragState(true);
        gl.domElement.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        event.stopPropagation();
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BEAM_HEIGHT);
        const hit = new THREE.Vector3();
        if (event.ray.intersectPlane(plane, hit)) applyHit(hit.x);
      }}
      onPointerUp={(event) => {
        if (!dragging.current) return;
        event.stopPropagation();
        dragging.current = false;
        props.onDragState(false);
        gl.domElement.releasePointerCapture(event.pointerId);
      }}
    >
      <mesh position={[0, BEAM_HEIGHT, 0]}>
        <boxGeometry args={[2.4, 5.4, 4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Post selected={props.selected} />
      <OpticBody type={props.element.type} params={props.element.params} />
      {props.selected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1.18, 48]} />
          <meshBasicMaterial color="#e0c48a" transparent opacity={0.95} />
        </mesh>
      )}
      {props.showLabel && (
        <Html position={[0, 0.22, 2.35]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
          <div className={`optic-label${props.selected ? ' selected' : ''}`}>
            {labelForType(props.element.type)}
            <small>{props.element.id}</small>
          </div>
        </Html>
      )}
    </group>
  );
}

function Post(props: { readonly selected: boolean }) {
  const post = props.selected ? '#2c261c' : '#1c1c20';
  const brass = props.selected ? '#e4c890' : '#9a7f55';
  return (
    <group>
      <mesh position={[0, BEAM_HEIGHT / 2 - 0.12, 1.62]} castShadow>
        <cylinderGeometry args={[0.2, 0.23, BEAM_HEIGHT - 0.18, 28]} />
        <meshStandardMaterial color={post} roughness={0.38} metalness={0.62} />
      </mesh>
      <mesh position={[0, 0.14, 1.62]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.78, 0.28, 32]} />
        <meshStandardMaterial color={props.selected ? '#3c362a' : '#2a2a30'} roughness={0.36} metalness={0.55} />
      </mesh>
      <mesh position={[0, BEAM_HEIGHT, 0.88]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 1.55, 18]} />
        <meshStandardMaterial color={brass} roughness={0.28} metalness={0.82} />
      </mesh>
      <mesh position={[0, BEAM_HEIGHT, 1.58]}>
        <boxGeometry args={[0.42, 0.28, 0.22]} />
        <meshStandardMaterial color={brass} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

export function OpticBody(props: { readonly type: string; readonly params: Record<string, unknown> }) {
  const diameter = typeof props.params.diameter === 'number' ? props.params.diameter : 0.0254;
  const r = Math.min(Math.max(diameter * 50, 0.65), 1.7);
  const theta = typeof props.params.theta === 'number' ? props.params.theta : 0;
  const T = typeof props.params.T === 'number' ? props.params.T : 1;

  if (props.type === 'thin_lens') return <ThinLens r={r} />;
  if (props.type === 'fiber_smf') return <FiberHead />;
  if (props.type === 'aperture_iris') return <Iris r={r} opening={Math.min(Math.max(diameter * 48, 0.18), r * 0.92)} />;
  if (props.type === 'mirror_curved') return <Mirror r={r} curved />;
  if (props.type.includes('mirror')) return <Mirror r={r} curved={false} />;
  if (props.type === 'pbs') return <PBS r={r} />;
  if (props.type === 'waveplate_quarter') return <Waveplate r={r} theta={theta} kind="λ/4" tint="#f4d89a" />;
  if (props.type === 'waveplate_half') return <Waveplate r={r} theta={theta} kind="λ/2" tint="#e8b8d4" />;
  if (props.type === 'polarizer_linear') return <Polarizer r={r} theta={theta} />;
  if (props.type === 'attenuator') return <Attenuator r={r} transmission={T} />;
  return <GenericPlate r={r} />;
}

function ThinLens(props: { readonly r: number }) {
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[props.r * 1.12, props.r * 1.12, 0.38, 48]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.42} metalness={0.55} />
      </mesh>
      <mesh scale={[0.3, 1, 1]} castShadow>
        <sphereGeometry args={[props.r * 1.02, 56, 36]} />
        <meshPhysicalMaterial
          color="#d7ecff"
          transmission={0.97}
          thickness={1.8}
          ior={1.52}
          roughness={0.02}
          metalness={0}
          transparent
          attenuationColor="#8fbfff"
          attenuationDistance={2.4}
        />
      </mesh>
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} rotation={[0, 0, Math.PI / 2]} position={[x, 0, 0]}>
          <torusGeometry args={[props.r * 1.12, 0.045, 10, 48]} />
          <meshStandardMaterial color="#c4a574" roughness={0.3} metalness={0.78} />
        </mesh>
      ))}
    </group>
  );
}

function FiberHead() {
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.55, 8]} />
        <meshStandardMaterial color="#c8c4bc" roughness={0.22} metalness={0.7} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.48, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.28, 24]} />
        <meshStandardMaterial color="#d8d4cc" roughness={0.2} metalness={0.65} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.95, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.7, 18]} />
        <meshStandardMaterial color="#1e4f9a" roughness={0.4} metalness={0.18} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[1.55, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.11, 0.7, 16]} />
        <meshStandardMaterial color="#163a74" roughness={0.48} metalness={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.055, 18, 18]} />
        <meshStandardMaterial color="#b8e4ff" emissive="#4aa8ff" emissiveIntensity={1.15} />
      </mesh>
    </group>
  );
}

function Iris(props: { readonly r: number; readonly opening: number }) {
  const blades = 8;
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[props.r * 1.22, props.r * 1.22, 0.18, 40]} />
        <meshStandardMaterial color="#151518" roughness={0.5} metalness={0.4} />
      </mesh>
      {Array.from({ length: blades }, (_, i) => {
        const angle = (i / blades) * Math.PI * 2;
        return (
          <group key={i} rotation={[angle, 0, 0]}>
            <mesh position={[0.01, (props.opening + props.r * 0.18) * 0.55, 0]} castShadow>
              <boxGeometry args={[0.05, props.r * 0.72, 0.34]} />
              <meshStandardMaterial color="#0c0c0e" roughness={0.55} metalness={0.28} />
            </mesh>
          </group>
        );
      })}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[props.r * 1.24, 0.055, 10, 40]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.35} metalness={0.55} />
      </mesh>
    </group>
  );
}

function Mirror(props: { readonly r: number; readonly curved: boolean }) {
  return (
    <group position={[0, BEAM_HEIGHT, 0]} rotation={[0, 0.16, 0]}>
      <mesh position={[-0.28, -props.r * 0.15, 0]} castShadow>
        <boxGeometry args={[0.18, props.r * 2.15, props.r * 2.15]} />
        <meshStandardMaterial color="#1b1b20" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[props.r, props.r, 0.14, 48]} />
        <meshStandardMaterial color="#e8e8ee" metalness={0.96} roughness={0.05} />
      </mesh>
      {props.curved ? (
        <mesh rotation={[0, Math.PI / 2, 0]} position={[0.04, 0, 0]}>
          <sphereGeometry args={[props.r * 1.35, 32, 20, 0, Math.PI]} />
          <meshStandardMaterial color="#cfd4de" metalness={0.94} roughness={0.06} />
        </mesh>
      ) : null}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.1, 0, 0]}>
        <cylinderGeometry args={[props.r * 1.08, props.r * 1.08, 0.1, 48]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.42} metalness={0.45} />
      </mesh>
    </group>
  );
}

function PBS(props: { readonly r: number }) {
  const s = props.r * 1.2;
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh castShadow>
        <boxGeometry args={[s, s, s]} />
        <meshPhysicalMaterial
          color="#eef6ff"
          transmission={0.93}
          thickness={1.3}
          ior={1.52}
          roughness={0.03}
          transparent
          attenuationColor="#c5dcff"
          attenuationDistance={2}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[s * 1.38, s * 0.98]} />
        <meshPhysicalMaterial
          color="#d5e4f6"
          metalness={0.55}
          roughness={0.08}
          transparent
          opacity={0.42}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -s / 2 - 0.06, 0]}>
        <boxGeometry args={[s * 1.08, 0.1, s * 1.08]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Waveplate(props: { readonly r: number; readonly theta: number; readonly kind: string; readonly tint: string }) {
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[props.r * 1.08, props.r * 1.08, 0.16, 48]} />
        <meshStandardMaterial color="#2a241c" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[props.r, props.r, 0.07, 48]} />
        <meshPhysicalMaterial
          color={props.tint}
          transmission={0.82}
          thickness={0.55}
          ior={1.55}
          roughness={0.04}
          transparent
          attenuationColor={props.tint}
          attenuationDistance={1.4}
        />
      </mesh>
      <group rotation={[props.theta, 0, 0]}>
        <mesh position={[0.1, 0, 0]}>
          <boxGeometry args={[0.03, props.r * 1.85, 0.045]} />
          <meshStandardMaterial color="#e0c48a" emissive="#c4a574" emissiveIntensity={0.35} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <Html position={[0, props.r * 1.28, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="optic-badge">{props.kind}</div>
      </Html>
    </group>
  );
}

function Polarizer(props: { readonly r: number; readonly theta: number }) {
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[props.r * 1.1, props.r * 1.1, 0.2, 48]} />
        <meshStandardMaterial color="#141416" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[props.r, props.r, 0.06, 48]} />
        <meshPhysicalMaterial color="#1c2430" transmission={0.35} thickness={0.4} roughness={0.12} transparent opacity={0.85} />
      </mesh>
      <group rotation={[props.theta, 0, 0]}>
        {Array.from({ length: 11 }, (_, i) => {
          const z = ((i - 5) / 5) * props.r * 0.82;
          return (
            <mesh key={i} position={[0.02, 0, z]}>
              <boxGeometry args={[0.015, props.r * 1.7, 0.018]} />
              <meshStandardMaterial color="#c9d4e2" metalness={0.85} roughness={0.18} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Attenuator(props: { readonly r: number; readonly transmission: number }) {
  const smoke = 1 - Math.min(Math.max(props.transmission, 0), 1);
  const color = new THREE.Color('#f0ebe0').lerp(new THREE.Color('#1a1a1c'), 0.25 + 0.7 * smoke);
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[props.r * 1.08, props.r * 1.08, 0.16, 40]} />
        <meshStandardMaterial color="#2c2418" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[props.r, props.r, 0.07, 40]} />
        <meshPhysicalMaterial
          color={color}
          transmission={0.2 + 0.55 * (1 - smoke)}
          thickness={0.7}
          roughness={0.08}
          transparent
          attenuationColor={color}
          attenuationDistance={0.8 + 1.4 * (1 - smoke)}
        />
      </mesh>
    </group>
  );
}

function GenericPlate(props: { readonly r: number }) {
  return (
    <group position={[0, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[props.r, props.r, 0.16, 40]} />
        <meshPhysicalMaterial color="#dcecff" transmission={0.88} thickness={0.8} ior={1.5} roughness={0.06} transparent />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[props.r * 1.05, 0.07, 10, 40]} />
        <meshStandardMaterial color="#c4a574" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}
