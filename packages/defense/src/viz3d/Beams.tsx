import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { waistAtUm } from '../physics/beams.ts';

/* ------------------------------------------------------------------------------------------ */
/* Instanced Gaussian tweezers: one lathe of w(z) = w0 √(1 + (z/z_R)²), drawn at every site.  */
/* ------------------------------------------------------------------------------------------ */

const TWEEZER_VERT = /* glsl */ `
  uniform float uW0;
  uniform float uZR;
  uniform vec3 uFocus;      // world xz of the spotlighted site (y ignored)
  uniform float uFocusR;    // radius inside which beams keep full brightness
  uniform float uFocusDim;  // 1 = no spotlight; <1 dims everything outside the radius
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec3 p = position;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    #ifdef USE_INSTANCING
      vec4 world = instanceMatrix * vec4(p, 1.0);
      vec3 site = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    #else
      vec4 world = vec4(p, 1.0);
      vec3 site = vec3(0.0);
    #endif
    float d = length(site.xz - uFocus.xz);
    float spot = mix(uFocusDim, 1.0, 1.0 - smoothstep(uFocusR, uFocusR * 1.6, d));
    float w = uW0 * sqrt(1.0 + (p.y * p.y) / (uZR * uZR));
    vec4 mv = modelViewMatrix * world;
    // instances are pure translations, so the model normal matrix applies unchanged
    vec3 n = normalize(normalMatrix * normal);
    vec3 v = normalize(-mv.xyz);
    float rim = 1.0 - abs(dot(n, v));
    // intensity ∝ (w0/w)²; the envelope is emphasised at grazing incidence so the
    // hourglass reads as a surface rather than fog
    vAlpha = spot * pow(uW0 / w, 1.4) * (0.2 + 0.8 * pow(rim, 1.6));
    gl_Position = projectionMatrix * mv;
  }
`;

const TWEEZER_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, uOpacity * vAlpha);
  }
`;

export type TweezerFieldProps = {
  /** xyz per instance, world units; mutated in place by the owner each frame. */
  positions: Float32Array;
  /** rgb per instance. */
  colors: Float32Array;
  count: number;
  /** Beam waist and Rayleigh range in world units. */
  w0: number;
  zR: number;
  /** Extent of the drawn envelope along the beam (y) relative to the focus. */
  yMin: number;
  yMax: number;
  opacity?: number;
  /** Optional spotlight, read every frame: { x, z, r, dim }. dim = 1 disables it. */
  focusRef?: { current: { x: number; z: number; r: number; dim: number } };
};

export function TweezerField({
  positions,
  colors,
  count,
  w0,
  zR,
  yMin,
  yMax,
  opacity = 0.18,
  focusRef,
}: TweezerFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const geometry = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const segs = 20;
    for (let i = 0; i <= segs; i += 1) {
      const y = yMin + ((yMax - yMin) * i) / segs;
      pts.push(new THREE.Vector2(waistAtUm(y, w0, zR), y));
    }
    return new THREE.LatheGeometry(pts, 12);
  }, [w0, zR, yMin, yMax]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: TWEEZER_VERT,
        fragmentShader: TWEEZER_FRAG,
        uniforms: {
          uW0: { value: w0 },
          uZR: { value: zR },
          uOpacity: { value: opacity },
          uFocus: { value: new THREE.Vector3() },
          uFocusR: { value: 1 },
          uFocusDim: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [w0, zR, opacity],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    const attr = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.instanceColor = attr;
  }, [colors]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    for (let i = 0; i < count; i += 1) {
      dummy.position.set(positions[i * 3] ?? 0, positions[i * 3 + 1] ?? 0, positions[i * 3 + 2] ?? 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    const f = focusRef?.current;
    if (f !== undefined) {
      (material.uniforms.uFocus!.value as THREE.Vector3).set(f.x, 0, f.z);
      material.uniforms.uFocusR!.value = f.r;
      material.uniforms.uFocusDim!.value = f.dim;
    }
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------------------------------ */
/* Instanced atom spheres with per-instance colour and scale (both mutable buffers).           */
/* ------------------------------------------------------------------------------------------ */

export function AtomField({
  positions,
  colors,
  scales,
  count,
  radius,
}: {
  positions: Float32Array;
  colors: Float32Array;
  scales: Float32Array;
  count: number;
  radius: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  }, [colors]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    for (let i = 0; i < count; i += 1) {
      const s = scales[i] ?? 1;
      dummy.position.set(positions[i * 3] ?? 0, positions[i * 3 + 1] ?? 0, positions[i * 3 + 2] ?? 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[radius, 14, 14]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Top-hat beam sheet lying in the atom plane, with travelling phase fronts.                   */
/* ------------------------------------------------------------------------------------------ */

const SHEET_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    vUv = uv;
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHEET_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPulse;
  uniform float uK;
  uniform float uSpeed;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    // plane geometry lies in x (beam axis) and y (top-hat extent) before rotation
    float edge = 1.0 - smoothstep(0.82, 1.0, abs(vUv.y * 2.0 - 1.0));
    float fronts = 0.5 + 0.5 * sin(uK * vLocal.x - uSpeed * uTime);
    float a = uOpacity * uPulse * edge * (0.35 + 0.65 * fronts);
    gl_FragColor = vec4(uColor, a);
  }
`;

export function BeamSheet({
  position,
  width,
  depth,
  color,
  pulseRef,
  k = 6,
  speed = 14,
  opacity = 0.55,
}: {
  position: readonly [number, number, number];
  width: number;
  depth: number;
  color: string;
  /** 0..1 envelope, read every frame. */
  pulseRef: { current: number };
  k?: number;
  speed?: number;
  opacity?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SHEET_VERT,
        fragmentShader: SHEET_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uK: { value: k },
          uSpeed: { value: speed },
          uOpacity: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [color, k, speed, opacity],
  );

  useFrame((state) => {
    material.uniforms.uTime!.value = state.clock.elapsedTime;
    material.uniforms.uPulse!.value = pulseRef.current;
  });

  return (
    <mesh position={[...position]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[width, depth, 1, 1]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Gaussian beam tube along x: nested shells at r = w, ⅔w, ⅓w with exp(−2r²/w²) weights.        */
/* ------------------------------------------------------------------------------------------ */

const TUBE_VERT = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TUBE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uK;
  uniform float uSpeed;
  uniform int uMode; // 0 plain, 1 travelling fronts, 2 standing wave
  uniform float uHalfLen;
  varying vec3 vLocal;
  void main() {
    float x = vLocal.y; // cylinder axis is local y; we rotate the mesh so it lies along world x
    float fronts = 1.0;
    if (uMode == 1) fronts = 0.55 + 0.45 * sin(uK * x - uSpeed * uTime);
    if (uMode == 2) fronts = 0.35 + 0.65 * pow(cos(uK * x), 2.0);
    float endFade = 1.0 - smoothstep(0.9, 1.0, abs(x) / uHalfLen);
    gl_FragColor = vec4(uColor, uOpacity * fronts * endFade);
  }
`;

export function GaussianTube({
  center,
  length,
  wy,
  wz,
  color,
  mode = 0,
  k = 8,
  speed = 10,
  opacity = 0.12,
  gainRef,
}: {
  center: readonly [number, number, number];
  length: number;
  /** 1/e² radii along world y and z (elliptical beams allowed). */
  wy: number;
  wz: number;
  color: string;
  mode?: 0 | 1 | 2;
  k?: number;
  speed?: number;
  opacity?: number;
  /** optional 0..1 multiplier read each frame */
  gainRef?: { current: number };
}) {
  const shells = [1, 2 / 3, 1 / 3] as const;
  const materials = useMemo(
    () =>
      shells.map(
        (f) =>
          new THREE.ShaderMaterial({
            vertexShader: TUBE_VERT,
            fragmentShader: TUBE_FRAG,
            uniforms: {
              uColor: { value: new THREE.Color(color) },
              uTime: { value: 0 },
              uOpacity: { value: opacity * Math.exp(-2 * f * f) * 2.2 },
              uK: { value: k },
              uSpeed: { value: speed },
              uMode: { value: mode },
              uHalfLen: { value: length / 2 },
            },
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, opacity, k, speed, mode, length],
  );

  const baseOpacity = useMemo(() => shells.map((f) => opacity * Math.exp(-2 * f * f) * 2.2), [opacity]);

  useFrame((state) => {
    const g = gainRef?.current ?? 1;
    materials.forEach((m, i) => {
      m.uniforms.uTime!.value = state.clock.elapsedTime;
      m.uniforms.uOpacity!.value = (baseOpacity[i] ?? 0) * g;
    });
  });

  // Rotating the cylinder by +90° about z sends its local y axis along world x;
  // local x then lies along world y and local z stays along world z.
  return (
    <group position={[...center]} rotation={[0, 0, Math.PI / 2]}>
      {materials.map((m, i) => {
        const f = shells[i] ?? 1;
        return (
          <mesh key={f} material={m} scale={[wy * f, 1, wz * f]}>
            <cylinderGeometry args={[1, 1, length, 40, 1, true]} />
          </mesh>
        );
      })}
    </group>
  );
}
