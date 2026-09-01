import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { BEAM_HEIGHT, M_TO_WORLD } from '../scale.ts';
import { sampleAtX, worldSpan, type BeamSampleWorld } from '../useLabModel.ts';

const SHELLS = 11;
const RINGS = 14;
const SEGS = 40;
const PLANAR_R = 80;

export function WavefrontField(props: {
  readonly samples: readonly BeamSampleWorld[];
  readonly color: string;
}) {
  const shells = useMemo(() => Array.from({ length: SHELLS }, () => makeCapGeometry()), []);
  const rim = useMemo(() => new THREE.Color('#f3e6c4'), []);
  const color = useMemo(() => new THREE.Color(props.color), [props.color]);

  useLayoutEffect(
    () => () => {
      for (const geometry of shells) geometry.dispose();
    },
    [shells],
  );

  useLayoutEffect(() => {
    const span = worldSpan(props.samples);
    const length = Math.max(span.maxX - span.minX, 0.5);
    for (let i = 0; i < shells.length; i += 1) {
      const x = span.minX + (length * (i + 0.5)) / shells.length;
      writeCap(shells[i]!, x, sampleAtX(props.samples, x));
    }
  }, [props.samples, shells]);

  return (
    <group>
      {shells.map((geometry, index) => (
        <group key={index}>
          <mesh geometry={geometry} frustumCulled={false}>
            <meshBasicMaterial
              color={rim}
              transparent
              opacity={0.28}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh geometry={geometry} frustumCulled={false}>
            <meshBasicMaterial color={color} wireframe transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const makeCapGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  const verts = (RINGS + 1) * SEGS;
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  const indices: number[] = [];
  for (let i = 0; i < RINGS; i += 1) {
    for (let j = 0; j < SEGS; j += 1) {
      const a = i * SEGS + j;
      const b = i * SEGS + ((j + 1) % SEGS);
      const c = (i + 1) * SEGS + j;
      const d = (i + 1) * SEGS + ((j + 1) % SEGS);
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.setIndex(indices);
  return geometry;
};

const writeCap = (geometry: THREE.BufferGeometry, x0: number, sample: BeamSampleWorld): void => {
  const attr = geometry.getAttribute('position');
  const R = sample.Rmetres * M_TO_WORLD;
  const planar = !Number.isFinite(sample.Rmetres) || Math.abs(R) > PLANAR_R;
  const rMax = planar ? sample.visualR * 1.02 : Math.min(sample.visualR * 1.02, Math.abs(R) * 0.93);
  for (let i = 0; i <= RINGS; i += 1) {
    const r = (rMax * i) / RINGS;
    const sag = planar || rMax < 1e-6 ? 0 : sagitta(r, R);
    for (let j = 0; j < SEGS; j += 1) {
      const theta = (j / SEGS) * Math.PI * 2;
      attr.setXYZ(i * SEGS + j, x0 - sag, BEAM_HEIGHT + r * Math.cos(theta), r * Math.sin(theta));
    }
  }
  attr.needsUpdate = true;
};

const sagitta = (r: number, R: number): number => {
  const rClamped = Math.min(r, Math.abs(R) * 0.999);
  return R - Math.sign(R) * Math.sqrt(R * R - rClamped * rClamped);
};
