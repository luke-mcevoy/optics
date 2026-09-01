import { Text } from '@react-three/drei';

export function ScaleBar({
  length,
  label,
  position = [1.6, -1.7, 0],
}: {
  length: number;
  label: string;
  position?: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[length / 2, 0, 0]}>
        <boxGeometry args={[length, 0.02, 0.02]} />
        <meshBasicMaterial color="#e8e4dc" />
      </mesh>
      <Text position={[length / 2, 0.16, 0]} fontSize={0.14} color="#e8e4dc" anchorX="center" anchorY="bottom">
        {label}
      </Text>
    </group>
  );
}
