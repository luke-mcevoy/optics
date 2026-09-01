import { type ReactNode, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LookingAt, type KeyItem } from '../components/LookingAt.tsx';

function SizedComposer({ children }: { children: ReactNode }) {
  const { size } = useThree();
  return (
    <EffectComposer key={`${Math.round(size.width)}x${Math.round(size.height)}`} multisampling={0}>
      {children}
    </EffectComposer>
  );
}

export function Stage3D({
  children,
  caption,
  camera = [0, 1.6, 6.4],
  lookingAt,
  keys,
  note,
}: {
  children: ReactNode;
  caption?: string;
  camera?: [number, number, number];
  lookingAt?: string;
  keys?: readonly KeyItem[];
  note?: ReactNode;
}) {
  return (
    <div className="board-stage">
      <div className="stage3d">
        {lookingAt !== undefined && keys !== undefined ? (
          <LookingAt title={lookingAt} items={keys} note={note} />
        ) : null}
        <Canvas
          dpr={[1, 2]}
          resize={{ scroll: false, debounce: 0 }}
          camera={{ fov: 38, position: camera, near: 0.05, far: 80 }}
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
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.35}
            minDistance={2.2}
            maxDistance={18}
            target={[0, 0.15, 0]}
          />
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
