import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraPreset } from '../layers.ts';

const PRESETS: Record<CameraPreset, { readonly pos: [number, number, number]; readonly target: [number, number, number] }> = {
  oblique: { pos: [15.5, 11.5, 17.5], target: [1.5, 4.1, 0] },
  side: { pos: [1.5, 4.7, 24], target: [1.5, 4.2, 0] },
  top: { pos: [1.5, 30, 0.25], target: [1.5, 0, 0] },
};

export function BenchCamera(props: { readonly enabled: boolean; readonly preset: CameraPreset }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    const next = PRESETS[props.preset];
    camera.position.set(...next.pos);
    controls.current?.target.set(...next.target);
    controls.current?.update();
  }, [props.preset, camera]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={props.enabled}
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2 - 0.04}
      target={[1.5, 4.1, 0]}
    />
  );
}
