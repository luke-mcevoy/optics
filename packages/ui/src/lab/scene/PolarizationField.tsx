import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PolarizationEllipse } from '@optics/kernel';
import { units } from '@optics/kernel';
import { BEAM_HEIGHT } from '../scale.ts';

export function PolarizationField(props: {
  readonly ellipse: PolarizationEllipse;
  readonly x: number;
  readonly visualR: number;
  readonly color: string;
}) {
  const psi = units.toRad(props.ellipse.orientation);
  const a = Math.max(props.visualR * 1.45, 0.55);
  const linear = props.ellipse.handedness === 'linear';
  const b = linear ? a * 0.025 : a * Math.max(Math.abs(props.ellipse.ellipticity), 0.1);
  const sense = props.ellipse.handedness === 'right' ? -1 : 1;
  const bead = useRef<THREE.Mesh>(null);

  const ring = useMemo(() => ellipsePoints(a, b, psi, 72), [a, b, psi]);
  const major = useMemo(
    () => [
      pointOnEllipse(a, b, psi, 0),
      pointOnEllipse(a, b, psi, Math.PI),
    ] as const,
    [a, b, psi],
  );

  useFrame(({ clock }) => {
    if (bead.current === null) return;
    const t = clock.elapsedTime * 2.4 * sense;
    const [y, z] = pointOnEllipse(a, b, psi, t);
    bead.current.position.set(0.02, y, z);
  });

  const caption =
    props.ellipse.handedness === 'linear'
      ? `linear  ${units.toDeg(props.ellipse.orientation).toFixed(1)}°`
      : `${props.ellipse.handedness}-circ  |ε| ${Math.abs(props.ellipse.ellipticity).toFixed(2)}`;

  return (
    <group position={[props.x, BEAM_HEIGHT, 0]}>
      <Line points={ring} color={props.color} transparent opacity={0.92} lineWidth={1.8} />
      <Line points={[...major]} color="#f3e6c4" transparent opacity={0.55} lineWidth={1.1} />
      <Line
        points={[
          [0, 0, -a * 1.15],
          [0, 0, a * 1.15],
        ]}
        color="#c4a574"
        transparent
        opacity={0.28}
        lineWidth={1}
      />
      <Line
        points={[
          [0, -a * 1.15, 0],
          [0, a * 1.15, 0],
        ]}
        color="#c4a574"
        transparent
        opacity={0.28}
        lineWidth={1}
      />
      <mesh ref={bead}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={props.color} emissive={props.color} emissiveIntensity={1.6} />
      </mesh>
      <Html position={[0, -a * 1.35, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="optic-label">{caption}</div>
      </Html>
    </group>
  );
}

const pointOnEllipse = (a: number, b: number, psi: number, t: number): [number, number] => {
  const jx = a * Math.cos(t);
  const jy = b * Math.sin(t);
  const z = jx * Math.cos(psi) - jy * Math.sin(psi);
  const y = jx * Math.sin(psi) + jy * Math.cos(psi);
  return [y, z];
};

const ellipsePoints = (a: number, b: number, psi: number, segs: number): [number, number, number][] => {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segs; i += 1) {
    const [y, z] = pointOnEllipse(a, b, psi, (i / segs) * Math.PI * 2);
    points.push([0, y, z]);
  }
  return points;
};
