import { useLayoutEffect, useMemo } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { Line, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { BEAM_HEIGHT } from '../scale.ts';
import type { BeamSampleWorld } from '../useLabModel.ts';

const EnvelopeMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#ff1f3a'),
    uOpacity: 0.2,
    uTime: 0,
  },
  /* glsl */ `
    varying float vAlong;
    void main() {
      vAlong = uv.x;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    varying float vAlong;
    void main() {
      float pulse = 0.76 + 0.24 * sin(uTime * 2.8 - vAlong * 36.0);
      float packet = exp(-55.0 * pow(fract(vAlong - uTime * 0.16) - 0.06, 2.0));
      float rim = smoothstep(0.0, 0.1, vAlong) * smoothstep(1.0, 0.9, vAlong);
      float alpha = uOpacity * (0.55 + 0.45 * rim) * pulse * (0.82 + 0.18 * packet);
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
);

extend({ EnvelopeMaterial });

type EnvelopeMaterialImpl = THREE.ShaderMaterial & {
  uColor: THREE.Color;
  uOpacity: number;
  uTime: number;
};

declare module '@react-three/fiber' {
  interface ThreeElements {
    envelopeMaterial: {
      uColor?: THREE.Color;
      uOpacity?: number;
      uTime?: number;
      transparent?: boolean;
      depthWrite?: boolean;
      side?: THREE.Side;
      blending?: THREE.Blending;
    };
  }
}

const RADIAL = 72;

const buildEnvelope = (samples: readonly BeamSampleWorld[], scale: number): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  if (samples.length < 2) return geometry;
  const rings = samples.length;
  const positions = new Float32Array(rings * RADIAL * 3);
  const uvs = new Float32Array(rings * RADIAL * 2);
  const indices: number[] = [];

  for (let i = 0; i < rings; i += 1) {
    const sample = samples[i]!;
    const r = Math.max(sample.visualR * scale, 0.04);
    for (let j = 0; j < RADIAL; j += 1) {
      const theta = (j / RADIAL) * Math.PI * 2;
      const idx = (i * RADIAL + j) * 3;
      positions[idx] = sample.x;
      positions[idx + 1] = BEAM_HEIGHT + r * Math.cos(theta);
      positions[idx + 2] = r * Math.sin(theta);
      const uv = (i * RADIAL + j) * 2;
      uvs[uv] = i / (rings - 1);
      uvs[uv + 1] = j / RADIAL;
    }
  }

  for (let i = 0; i < rings - 1; i += 1) {
    for (let j = 0; j < RADIAL; j += 1) {
      const a = i * RADIAL + j;
      const b = i * RADIAL + ((j + 1) % RADIAL);
      const c = (i + 1) * RADIAL + j;
      const d = (i + 1) * RADIAL + ((j + 1) % RADIAL);
      indices.push(a, c, b, b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

export function BeamField(props: {
  readonly samples: readonly BeamSampleWorld[];
  readonly color: string;
  readonly glow: string;
}) {
  const outer = useMemo(() => buildEnvelope(props.samples, 1), [props.samples]);
  const mid = useMemo(() => buildEnvelope(props.samples, 0.55), [props.samples]);
  const core = useMemo(() => buildEnvelope(props.samples, 0.22), [props.samples]);
  const color = useMemo(() => new THREE.Color(props.color), [props.color]);
  const glow = useMemo(() => new THREE.Color(props.glow), [props.glow]);

  useLayoutEffect(
    () => () => {
      outer.dispose();
      mid.dispose();
      core.dispose();
    },
    [outer, mid, core],
  );

  return (
    <group>
      <mesh geometry={outer} frustumCulled={false}>
        <envelopeMaterial
          uColor={color}
          uOpacity={0.045}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh geometry={mid} frustumCulled={false}>
        <envelopeMaterial
          uColor={color}
          uOpacity={0.07}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh geometry={core} frustumCulled={false}>
        <envelopeMaterial
          uColor={glow}
          uOpacity={0.2}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <AxisGlow samples={props.samples} color={props.glow} />
    </group>
  );
}

function AxisGlow(props: { readonly samples: readonly BeamSampleWorld[]; readonly color: string }) {
  const points = useMemo(
    () => props.samples.map((sample) => [sample.x, BEAM_HEIGHT, 0] as [number, number, number]),
    [props.samples],
  );
  return <Line points={points} color={props.color} transparent opacity={0.55} lineWidth={1} />;
}

export function useEnvelopeClock(): void {
  useFrame(({ clock, scene }) => {
    scene.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as EnvelopeMaterialImpl | undefined;
      if (mat !== undefined && 'uTime' in mat) mat.uTime = clock.elapsedTime;
    });
  });
}
