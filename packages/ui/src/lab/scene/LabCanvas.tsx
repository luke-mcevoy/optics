import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { polarizationEllipseAt } from '@optics/bench';
import { units } from '@optics/kernel';
import { OpticalTable } from './OpticalTable.tsx';
import { BeamField, useEnvelopeClock } from './BeamField.tsx';
import { WavefrontField } from './Wavefronts.tsx';
import { RayBundle } from './Rays.tsx';
import { ProbeCard, WaistRing } from './ProbeCard.tsx';
import { MountedOptics, OpticBody } from './MountedOptics.tsx';
import { BenchCamera } from './Cinematography.tsx';
import { AxisRuler } from './AxisRuler.tsx';
import { PolarizationField } from './PolarizationField.tsx';
import { CATALOG, Z_MAX, Z_MIN } from '../catalog.ts';
import type { CameraPreset, LabLayers } from '../layers.ts';
import { BEAM_HEIGHT, opticX, visualRadius, worldXToZMetres } from '../scale.ts';
import { sampleAtX, type LabModel } from '../useLabModel.ts';
import type { BenchElement } from '@optics/bench';

export function LabCanvas(props: {
  readonly model: LabModel;
  readonly elements: readonly BenchElement[];
  readonly selectedId: string | null;
  readonly placingType: string | null;
  readonly probeZ: number;
  readonly layers: LabLayers;
  readonly cameraPreset: CameraPreset;
  readonly onSelect: (id: string | null) => void;
  readonly onMove: (id: string, zMetres: number) => void;
  readonly onPlace: (type: string, zMetres: number) => void;
  readonly onProbeZ: (zMetres: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const probe = sampleAtX(props.model.samples, opticX(props.probeZ, props.model.zMin));
  const ellipse = ellipseAt(props.model, props.probeZ);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 32, position: [15.5, 11.5, 17.5], near: 0.1, far: 120 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      onPointerMissed={() => {
        if (props.placingType === null) props.onSelect(null);
      }}
    >
      <color attach="background" args={['#070708']} />
      <fog attach="fog" args={['#070708', 30, 72]} />
      <Lighting />
      <OpticalTable />
      <AxisRuler zMin={props.model.zMin} />
      {props.placingType !== null && (
        <WorkPlane zMin={props.model.zMin} placingType={props.placingType} onPlace={props.onPlace} />
      )}
      <MountedOptics
        elements={props.elements}
        zMin={props.model.zMin}
        selectedId={props.selectedId}
        showLabels={props.layers.labels}
        onSelect={props.onSelect}
        onMove={props.onMove}
        onDragState={setDragging}
      />
      {props.layers.envelope && (
        <BeamField samples={props.model.samples} color={props.model.color} glow={props.model.glow} />
      )}
      {props.layers.wavefronts && <WavefrontField samples={props.model.samples} color={props.model.glow} />}
      {props.layers.rays && <RayBundle result={props.model.result} samples={props.model.samples} color="#f0d9a0" />}
      <WaistRing x={props.model.waistX} visualR={visualRadius(props.model.waistW)} color={props.model.glow} />
      <group
        onPointerDown={(event) => {
          event.stopPropagation();
          setDragging(true);
          event.nativeEvent.target instanceof Element &&
            event.nativeEvent.target.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragging && event.buttons === 0) return;
          if (event.buttons === 0 && !dragging) return;
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BEAM_HEIGHT);
          const hit = new THREE.Vector3();
          if (event.ray.intersectPlane(plane, hit)) {
            const z = THREE.MathUtils.clamp(worldXToZMetres(hit.x, props.model.zMin), Z_MIN, Z_MAX);
            if (event.buttons > 0 || dragging) props.onProbeZ(z);
          }
        }}
        onPointerUp={() => setDragging(false)}
      >
        <ProbeCard sample={probe} color={props.model.color} visible />
      </group>
      {props.layers.polarization && ellipse !== null && (
        <PolarizationField
          ellipse={ellipse}
          x={probe.x}
          visualR={Math.max(probe.visualR, 0.45)}
          color={props.model.glow}
        />
      )}
      <SourceHead x={props.model.samples[0]?.x ?? -12} color={props.model.color} />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={50} blur={2.2} far={8} />
      <Environment preset="warehouse" environmentIntensity={0.34} />
      <BenchCamera enabled={!dragging} preset={props.cameraPreset} />
      <Post />
      <Clock />
    </Canvas>
  );
}

function WorkPlane(props: {
  readonly zMin: number;
  readonly placingType: string | null;
  readonly onPlace: (type: string, zMetres: number) => void;
}) {
  const [ghostX, setGhostX] = useState<number | null>(null);
  const item = CATALOG.find((entry) => entry.type === props.placingType);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
        onPointerMove={(event) => setGhostX(event.point.x)}
        onPointerOut={() => setGhostX(null)}
        onPointerDown={(event) => {
          if (props.placingType === null || item === undefined) return;
          event.stopPropagation();
          const z = THREE.MathUtils.clamp(worldXToZMetres(event.point.x, props.zMin), Z_MIN, Z_MAX);
          props.onPlace(item.type, z);
        }}
      >
        <planeGeometry args={[40, 20]} />
        <meshBasicMaterial transparent opacity={0.16} color="#c4a574" />
      </mesh>
      {ghostX !== null && item !== undefined && (
        <group position={[ghostX, 0, 0]}>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 1.05, 40]} />
            <meshBasicMaterial color="#e0c48a" transparent opacity={0.85} />
          </mesh>
          <group>
            <OpticBody type={item.type} params={item.params} />
          </group>
        </group>
      )}
    </group>
  );
}

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#44505c', '#09090b', 0.58]} />
      <spotLight
        position={[4, 22, 10]}
        angle={0.55}
        penumbra={0.75}
        intensity={38}
        color="#efe6d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <spotLight position={[12, 28, 14]} angle={0.32} penumbra={0.9} intensity={24} color="#fff7ee" />
      <spotLight position={[-16, 14, -10]} angle={0.5} penumbra={0.9} intensity={13} color="#6f8aaa" />
      <pointLight position={[0, 10, 8]} intensity={7} color="#ffd8c0" />
    </>
  );
}

function Post() {
  return (
    <EffectComposer enableNormalPass={false}>
      <SMAA />
      <Bloom luminanceThreshold={0.4} intensity={0.38} mipmapBlur luminanceSmoothing={0.22} />
      <Vignette offset={0.16} darkness={0.58} />
    </EffectComposer>
  );
}

function Clock() {
  useEnvelopeClock();
  return null;
}

function SourceHead(props: { readonly x: number; readonly color: string }) {
  return (
    <group position={[props.x - 1.55, BEAM_HEIGHT, 0]}>
      <mesh castShadow>
        <boxGeometry args={[2.35, 1.15, 1.15]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.32} metalness={0.62} />
      </mesh>
      {[-0.55, -0.15, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.62, 0]}>
          <boxGeometry args={[0.12, 0.16, 1.05]} />
          <meshStandardMaterial color="#2a2a30" roughness={0.4} metalness={0.55} />
        </mesh>
      ))}
      <mesh position={[0.15, 0.02, 0.58]}>
        <boxGeometry args={[1.9, 0.12, 0.04]} />
        <meshStandardMaterial color="#c4a218" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[1.22, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 0.28, 24]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[1.42, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.16, 24]} />
        <meshStandardMaterial color={props.color} emissive={props.color} emissiveIntensity={2.1} />
      </mesh>
      <mesh position={[-0.35, -BEAM_HEIGHT / 2, 1.45]}>
        <cylinderGeometry args={[0.2, 0.22, BEAM_HEIGHT - 0.25, 18]} />
        <meshStandardMaterial color="#1a1a1d" roughness={0.45} metalness={0.5} />
      </mesh>
    </group>
  );
}

const ellipseAt = (model: LabModel, zMetres: number) => {
  try {
    return polarizationEllipseAt(model.result, units.m(zMetres));
  } catch {
    return null;
  }
};
