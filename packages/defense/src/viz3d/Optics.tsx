import * as THREE from 'three';

export function TweezerBeam({
  position = [0, 0, 0],
  color = '#f5b942',
  length = 4.2,
  waist = 0.16,
}: {
  position?: [number, number, number];
  color?: string;
  length?: number;
  waist?: number;
}) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, 0]} position={[0, length / 2, 0]}>
        <cylinderGeometry args={[waist * 2.4, waist, length, 24, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[waist, 0.012, 10, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

export function ZoneBox({
  position,
  size,
  color,
  label: _label,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} />
    </mesh>
  );
}

export function LaserRay({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const len = Math.hypot(dx, dy, dz);
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.025, 0.025, len, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} />
    </mesh>
  );
}
