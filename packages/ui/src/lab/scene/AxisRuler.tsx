import { Html, Line } from '@react-three/drei';
import { Z_MAX, Z_MIN } from '../catalog.ts';
import { TABLE_WIDTH, opticX } from '../scale.ts';

const TICK_MM = 20;
const MAJOR_MM = 50;

export function AxisRuler(props: { readonly zMin: number }) {
  const z0 = Z_MIN;
  const z1 = Z_MAX;
  const x0 = opticX(z0, props.zMin);
  const x1 = opticX(z1, props.zMin);
  const zFront = TABLE_WIDTH / 2 - 0.85;
  const ticks: { readonly x: number; readonly mm: number; readonly major: boolean }[] = [];
  for (let mm = Math.ceil((z0 * 1e3) / TICK_MM) * TICK_MM; mm <= z1 * 1e3 + 0.5; mm += TICK_MM) {
    ticks.push({
      x: opticX(mm / 1e3, props.zMin),
      mm,
      major: mm % MAJOR_MM === 0,
    });
  }

  return (
    <group>
      <Line
        points={[
          [x0, 0.045, zFront],
          [x1, 0.045, zFront],
        ]}
        color="#c4a574"
        transparent
        opacity={0.7}
        lineWidth={1.4}
      />
      {ticks.map((tick) => (
        <group key={tick.mm} position={[tick.x, 0.045, zFront]}>
          <Line
            points={[
              [0, 0, 0],
              [0, 0, tick.major ? -0.42 : -0.22],
            ]}
            color="#c4a574"
            transparent
            opacity={tick.major ? 0.85 : 0.4}
            lineWidth={1}
          />
          {tick.major ? (
            <Html position={[0, 0.02, 0.28]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
              <div className="axis-tick">{tick.mm}</div>
            </Html>
          ) : null}
        </group>
      ))}
      <Html position={[(x0 + x1) / 2, 0.02, zFront + 0.55]} center distanceFactor={26} style={{ pointerEvents: 'none' }}>
        <div className="axis-tick axis-caption">z / mm</div>
      </Html>
    </group>
  );
}
