import { Html } from '@react-three/drei';

export function Callout({
  position,
  children,
}: {
  position: [number, number, number];
  children: string;
}) {
  return (
    <Html position={position} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div className="callout">{children}</div>
    </Html>
  );
}
