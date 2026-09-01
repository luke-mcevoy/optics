import { Html } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { formatMetres } from '../format.ts';
import { BEAM_HEIGHT } from '../scale.ts';
import type { BeamSampleWorld } from '../useLabModel.ts';

const CARD = 5.6;

export function ProbeCard(props: {
  readonly sample: BeamSampleWorld;
  readonly color: string;
  readonly visible: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uW: { value: 1 },
      uColor: { value: new THREE.Color(props.color) },
    }),
    [props.color],
  );

  useFrame(() => {
    if (mat.current === null) return;
    mat.current.uniforms.uW!.value = Math.max(props.sample.visualR, 0.08);
    (mat.current.uniforms.uColor!.value as THREE.Color).set(props.color);
  });

  if (!props.visible) return null;

  return (
    <group position={[props.sample.x, BEAM_HEIGHT, 0]}>
      <mesh>
        <planeGeometry args={[CARD, CARD]} />
        <shaderMaterial
          ref={mat}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[CARD / 2 - 0.045, CARD / 2, 64]} />
        <meshStandardMaterial color="#c4a574" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD + 0.12, CARD + 0.12]} />
        <meshStandardMaterial color="#2a1d12" roughness={0.85} metalness={0.05} transparent opacity={0.55} />
      </mesh>
      <Html position={[0, -CARD / 2 - 0.28, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
        <div className="optic-label">
          probe
          <small>w {formatMetres(props.sample.wMetres)}</small>
        </div>
      </Html>
    </group>
  );
}

export function WaistRing(props: { readonly x: number; readonly visualR: number; readonly color: string }) {
  const r = Math.max(props.visualR, 0.18);
  return (
    <group position={[props.x, BEAM_HEIGHT, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[r * 1.05, 0.035, 12, 64]} />
        <meshStandardMaterial color="#e6c27a" emissive={props.color} emissiveIntensity={0.35} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uW;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * ${CARD.toFixed(1)};
    float r2 = dot(p, p);
    float w2 = max(uW * uW, 1e-6);
    float I = exp(-2.0 * r2 / w2);
    float disk = smoothstep(0.02, 0.0, length(p) - ${((CARD / 2) * 0.98).toFixed(2)});
    vec3 col = uColor * (0.15 + 1.7 * I);
    gl_FragColor = vec4(col, disk * (0.12 + 0.78 * I));
  }
`;
