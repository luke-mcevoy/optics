import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { PropagationResult } from '@optics/bench';
import { traceRayBundle } from '../traceRays.ts';
import type { BeamSampleWorld } from '../useLabModel.ts';

export function RayBundle(props: {
  readonly result: PropagationResult;
  readonly samples: readonly BeamSampleWorld[];
  readonly color: string;
}) {
  const rays = useMemo(
    () => traceRayBundle(props.result, props.samples),
    [props.result, props.samples],
  );

  return (
    <group>
      {rays.map((ray, index) => (
        <Line
          key={index}
          points={ray.points}
          color={index === 0 ? '#f7f0dc' : props.color}
          transparent
          opacity={index === 0 ? 0.7 : 0.52}
          lineWidth={index === 0 ? 1.8 : 1.25}
        />
      ))}
    </group>
  );
}
