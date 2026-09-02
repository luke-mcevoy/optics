import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export function Callout({
  position,
  children,
  fixed = false,
  showWithin,
  small = false,
}: {
  position: [number, number, number];
  children: string;
  /** Keep a constant pixel size instead of scaling with distance. */
  fixed?: boolean;
  /** Fade the label out when the camera is farther than this (world units). */
  showWithin?: number;
  small?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const anchor = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const el = ref.current;
    const g = anchor.current;
    if (el === null || g === null || showWithin === undefined) return;
    g.getWorldPosition(tmp);
    const d = camera.position.distanceTo(tmp);
    const o = 1 - Math.min(1, Math.max(0, (d - showWithin) / (showWithin * 0.25)));
    el.style.opacity = o.toFixed(2);
  });
  return (
    <group ref={anchor} position={position}>
      <Html center {...(fixed ? {} : { distanceFactor: 8 })} style={{ pointerEvents: 'none' }} zIndexRange={[5, 0]}>
        <div ref={ref} className={small ? 'callout callout-small' : 'callout'}>
          {children}
        </div>
      </Html>
    </group>
  );
}
