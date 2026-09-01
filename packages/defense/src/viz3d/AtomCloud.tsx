import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleOrbital, worldScale } from '../physics/orbitals.ts';

const sprite = makeSprite();

export function AtomCloud({
  n,
  l = 0,
  count = 18000,
  color = '#8ec8ff',
  position = [0, 0, 0],
  scale,
  size = 0.045,
  opacity = 0.9,
}: {
  n: number;
  l?: number;
  count?: number;
  color?: string;
  position?: [number, number, number];
  scale?: number;
  size?: number;
  opacity?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(
    () => sampleOrbital({ n, l, count, seed: Math.round(n * 17 + l * 9) }),
    [n, l, count],
  );
  const s = scale ?? worldScale(n, 2.4, l);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  useFrame((_, dt) => {
    if (group.current === null) return;
    group.current.rotation.y += dt * 0.09;
  });

  return (
    <group ref={group} position={position}>
      <points geometry={geom} scale={s}>
        <pointsMaterial
          map={sprite}
          color={color}
          size={size}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <mesh>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color="#ffe8c2"
          emissive="#ffb347"
          emissiveIntensity={2.4}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

export function AtomCloudField({
  local,
  sites,
  scale,
  size = 0.035,
}: {
  local: Float32Array;
  sites: readonly { position: [number, number, number]; color: string }[];
  scale: number;
  size?: number;
}) {

  const merged = useMemo(() => {
    const out = new Float32Array(local.length * sites.length);
    for (let s = 0; s < sites.length; s += 1) {
      const site = sites[s];
      if (site === undefined) continue;
      const [ox, oy, oz] = site.position;
      for (let i = 0; i < local.length; i += 3) {
        const o = s * local.length + i;
        out[o] = (local[i] ?? 0) * scale + ox;
        out[o + 1] = (local[i + 1] ?? 0) * scale + oy;
        out[o + 2] = (local[i + 2] ?? 0) * scale + oz;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(out, 3));
    const colors = new Float32Array(out.length);
    const c = new THREE.Color();
    for (let s = 0; s < sites.length; s += 1) {
      const site = sites[s];
      if (site === undefined) continue;
      c.set(site.color);
      for (let i = 0; i < local.length; i += 3) {
        const o = s * local.length + i;
        colors[o] = c.r;
        colors[o + 1] = c.g;
        colors[o + 2] = c.b;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [local, sites, scale]);

  return (
    <group>
      <points geometry={merged}>
        <pointsMaterial
          map={sprite}
          vertexColors
          size={size}
          transparent
          opacity={0.88}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      {sites.map((site, i) => (
        <mesh key={i} position={site.position}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshStandardMaterial color="#ffe8c2" emissive={site.color} emissiveIntensity={1.6} />
        </mesh>
      ))}
    </group>
  );
}

function makeSprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx === null) throw new Error('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
