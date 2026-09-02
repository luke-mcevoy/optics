import { type ReactNode, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LookingAt, type KeyItem } from '../components/LookingAt.tsx';
import { useInView } from '../viz/useInView.ts';

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
 * Camera rigs are authored for a landscape frame. The vertical FOV is fixed, so a portrait
 * canvas shows less width; back the camera off by this factor to keep the scene in frame.
 */
function useAspectFactor(): number {
  const aspect = useThree((s) => s.viewport.aspect);
  // Sub-linear: full compensation would shrink the scene too far for the fixed-size callouts.
  return aspect < 1.4 ? Math.min(1.7, (1.4 / aspect) ** 0.6) : 1;
}

function scaledGoal(position: V3, target: V3, k: number): THREE.Vector3 {
  const t = new THREE.Vector3(...target);
  return new THREE.Vector3(...position).sub(t).multiplyScalar(k).add(t);
}

/**
 * Glides the camera and orbit target to a new rig whenever `rig` changes, then releases
 * control so the user can orbit freely from there.
 */
function RigDriver({ rig }: { rig: CameraRig }) {
  const { camera, controls } = useThree();
  const k = useAspectFactor();
  const goalPos = useRef(scaledGoal(rig.position, rig.target, k));
  const goalTarget = useRef(new THREE.Vector3(...rig.target));
  const active = useRef(true);

  useEffect(() => {
    goalPos.current.copy(scaledGoal(rig.position, rig.target, k));
    goalTarget.current.set(...rig.target);
    active.current = true;
  }, [rig, k]);

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

/** Static-camera stages: apply the portrait back-off once per aspect change. */
function StaticFit({ position, target }: { position: V3; target: V3 }) {
  const { camera, controls } = useThree();
  const k = useAspectFactor();
  // Compare by value: callers pass fresh array literals on every render.
  const posKey = position.join(',');
  const targetKey = target.join(',');
  useEffect(() => {
    const [px, py, pz] = posKey.split(',').map(Number) as [number, number, number];
    const [tx, ty, tz] = targetKey.split(',').map(Number) as [number, number, number];
    camera.position.copy(scaledGoal([px, py, pz], [tx, ty, tz], k));
    const orbit = controls as unknown as { update: () => void } | null;
    orbit?.update();
  }, [camera, controls, k, posKey, targetKey]);
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
  fogRange = [10, 26],
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
  /** Near/far distances of the background fog; widen for table-scale scenes. */
  fogRange?: readonly [number, number];
}) {
  const host = useRef<HTMLDivElement>(null);
  // Mount the WebGL context only when the board is within ~a screen of the viewport, and
  // stop the render loop entirely while it is scrolled out of sight.
  const near = useInView(host, '1200px');
  const visible = useInView(host, '120px');
  return (
    <div className="board-stage" ref={host}>
      <div className={tall ? 'stage3d tall' : 'stage3d'}>
        {lookingAt !== undefined && keys !== undefined ? (
          <LookingAt title={lookingAt} items={keys} note={note} />
        ) : null}
        {overlay}
        {!near ? <div className="stage3d-idle" aria-hidden="true" /> : null}
        {near ? (
          <Canvas
            dpr={[1, 1.75]}
            frameloop={visible ? 'always' : 'never'}
            resize={{ scroll: false, debounce: 0 }}
            camera={{ fov: 38, position: rig ? [...rig.position] : camera, near: 0.05, far: 120 }}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.15,
            }}
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <color attach="background" args={['#07080b']} />
            <fog attach="fog" args={['#07080b', fogRange[0], fogRange[1]]} />
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
            {rig ? <RigDriver rig={rig} /> : <StaticFit position={camera} target={[0, 0.15, 0]} />}
            <SizedComposer>
              <Bloom intensity={0.55} luminanceThreshold={0.18} luminanceSmoothing={0.4} mipmapBlur />
              <Vignette eskil={false} offset={0.15} darkness={0.65} />
            </SizedComposer>
          </Canvas>
        ) : null}
        <p className="stage3d-hint">drag to orbit · scroll to zoom</p>
      </div>
      {caption !== undefined ? <p className="board-cap">{caption}</p> : null}
    </div>
  );
}
