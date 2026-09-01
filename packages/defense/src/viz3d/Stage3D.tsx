import { type ReactNode, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LookingAt, type KeyItem } from '../components/LookingAt.tsx';

export type V3 = readonly [number, number, number];

export type CameraRig = {
  position: V3;
  target: V3;
};

function SizedComposer({ children }: { children: ReactNode }) {
  const { size } = useThree();
  return (
    <EffectComposer key={`${Math.round(size.width)}x${Math.round(size.height)}`} multisampling={0}>
      {children}
    </EffectComposer>
  );
}

/**
 * Glides the camera and orbit target to a new rig whenever `rig` changes, then releases
 * control so the user can orbit freely from there.
 */
function RigDriver({ rig }: { rig: CameraRig }) {
  const { camera, controls } = useThree();
  const goalPos = useRef(new THREE.Vector3(...rig.position));
  const goalTarget = useRef(new THREE.Vector3(...rig.target));
  const active = useRef(true);

  useEffect(() => {
    goalPos.current.set(...rig.position);
    goalTarget.current.set(...rig.target);
    active.current = true;
  }, [rig]);

  useFrame((_, dt) => {
    if (!active.current) return;
    const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (orbit === null) return;
    const k = 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(goalPos.current, k);
    orbit.target.lerp(goalTarget.current, k);
    orbit.update();
    if (
      camera.position.distanceToSquared(goalPos.current) < 1e-4 &&
      orbit.target.distanceToSquared(goalTarget.current) < 1e-4
    ) {
      active.current = false;
    }
  });
  return null;
}

export function Stage3D({
  children,
  caption,
  camera = [0, 1.6, 6.4],
  lookingAt,
  keys,
  note,
  rig,
  autoRotate = true,
  minDistance = 2.2,
  maxDistance = 18,
  tall = false,
  overlay,
}: {
  children: ReactNode;
  caption?: string;
  camera?: [number, number, number];
  lookingAt?: string;
  keys?: readonly KeyItem[];
  note?: ReactNode;
  /** Animated camera goal; when supplied, overrides `camera` after mount. */
  rig?: CameraRig;
  autoRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  tall?: boolean;
  /** Extra DOM drawn over the canvas (e.g. a phase label). */
  overlay?: ReactNode;
}) {
  return (
    <div className="board-stage">
      <div className={tall ? 'stage3d tall' : 'stage3d'}>
        {lookingAt !== undefined && keys !== undefined ? (
          <LookingAt title={lookingAt} items={keys} note={note} />
        ) : null}
        {overlay}
        <Canvas
          dpr={[1, 2]}
          resize={{ scroll: false, debounce: 0 }}
          camera={{ fov: 38, position: rig ? [...rig.position] : camera, near: 0.05, far: 80 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <color attach="background" args={['#07080b']} />
          <fog attach="fog" args={['#07080b', 10, 26]} />
          <ambientLight intensity={0.12} />
          <spotLight position={[6, 10, 4]} intensity={18} angle={0.5} penumbra={1} color="#f2e4c4" />
          <pointLight position={[-4, 2, -3]} intensity={8} color="#5ec8e5" />
          <pointLight position={[3, -1, 5]} intensity={6} color="#c9a0ff" />
          <Suspense fallback={null}>{children}</Suspense>
          <gridHelper args={[24, 24, '#1b1f24', '#12151a']} position={[0, -2.15, 0]} />
          <OrbitControls
            makeDefault
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.35}
            minDistance={minDistance}
            maxDistance={maxDistance}
            target={rig ? [...rig.target] : [0, 0.15, 0]}
          />
          {rig ? <RigDriver rig={rig} /> : null}
          <SizedComposer>
            <Bloom intensity={0.55} luminanceThreshold={0.18} luminanceSmoothing={0.4} mipmapBlur />
            <Vignette eskil={false} offset={0.15} darkness={0.65} />
          </SizedComposer>
        </Canvas>
        <p className="stage3d-hint">drag to orbit · scroll to zoom</p>
      </div>
      {caption !== undefined ? <p className="board-cap">{caption}</p> : null}
    </div>
  );
}
