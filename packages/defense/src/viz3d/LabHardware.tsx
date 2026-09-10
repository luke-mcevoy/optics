/** Mechanical detail for the schematic apparatus. Dimensions are illustration units. */
import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const METAL = { color: '#79858e', metalness: 0.88, roughness: 0.26 };
const BLACK = { color: '#1c242c', metalness: 0.72, roughness: 0.3 };

export function Screw({ at, radius = 0.022 }: { at: [number, number, number]; radius?: number }) {
  return <group position={at}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius, 0.014, 12]} /><meshStandardMaterial {...METAL} /></mesh>
    <mesh position={[0, 0, 0.009]}><boxGeometry args={[radius * 1.3, radius * 0.2, 0.003]} /><meshBasicMaterial color="#0b1118" /></mesh>
  </group>;
}

export function OpticalPost({ position, top }: { position: readonly [number, number, number]; top?: number }) {
  const height = Math.max(0.08, top ?? position[1] - 0.22);
  return <group position={[position[0], 0, position[2]]}>
    <RoundedBox args={[0.44, 0.07, 0.3]} radius={0.035} position={[0, 0.035, 0]}><meshStandardMaterial {...BLACK} /></RoundedBox>
    <mesh position={[0, height * 0.36, 0]}><cylinderGeometry args={[0.07, 0.09, height * 0.66, 20]} /><meshStandardMaterial {...BLACK} /></mesh>
    <mesh position={[0, height * 0.68, 0]}><cylinderGeometry args={[0.043, 0.043, height * 0.66, 20]} /><meshStandardMaterial {...METAL} /></mesh>
    <mesh position={[0.1, height * 0.44, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.07, 12]} /><meshStandardMaterial {...BLACK} /></mesh>
  </group>;
}

export function OpticalTable() {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#75818a'; ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y++) { ctx.fillStyle = `rgba(255,255,255,${0.015 + (y * 17 % 11) * 0.002})`; ctx.fillRect(0, y, 128, 1); }
    ctx.fillStyle = '#a3aeb5'; ctx.beginPath(); ctx.arc(64, 64, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#17232d'; ctx.beginPath(); ctx.arc(64, 64, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#070d13'; ctx.beginPath(); ctx.arc(64, 65, 4, 0, Math.PI * 2); ctx.fill();
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(42, 31); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return <group>
    <RoundedBox args={[21.2, 0.55, 15.7]} radius={0.12} position={[0, -0.3, 0]}><meshStandardMaterial {...BLACK} /></RoundedBox>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0]} receiveShadow><planeGeometry args={[21, 15.5]} /><meshStandardMaterial map={map} color="#52616c" metalness={0.55} roughness={0.46} /></mesh>
    {[-8.5, 8.5].flatMap(x => [-5.5, 5.5].map(z => <group key={`${x}/${z}`} position={[x, -1.1, z]}>
      <mesh><cylinderGeometry args={[0.52, 0.65, 1.15, 24]} /><meshStandardMaterial {...BLACK} /></mesh>
      <mesh position={[0, -0.57, 0]}><cylinderGeometry args={[0.7, 0.7, 0.1, 24]} /><meshStandardMaterial {...METAL} /></mesh>
    </group>))}
  </group>;
}

export function ObjectiveBarrel({ height = 0.6 }: { height?: number }) {
  const profile = useMemo(() => [[0.28, -0.5], [0.31, -0.48], [0.31, -0.35], [0.34, -0.32], [0.34, 0.12], [0.43, 0.17], [0.43, 0.42], [0.41, 0.5]].map(([r, y]) => new THREE.Vector2(r!, y! * height)), [height]);
  return <group>
    <mesh><latheGeometry args={[profile, 64]} /><meshStandardMaterial {...BLACK} /></mesh>
    {[-0.45, -0.32, 0.17, 0.39, 0.48].map((y, i) => <mesh key={y} position={[0, y * height, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[i < 2 ? 0.318 : 0.435, 0.012, 8, 64]} /><meshStandardMaterial {...METAL} /></mesh>)}
    {Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.431, height * 0.27, Math.sin(a) * 0.431]} rotation={[0, -a, 0]}><boxGeometry args={[0.012, height * 0.15, 0.018]} /><meshStandardMaterial {...METAL} /></mesh>; })}
    <mesh position={[0, -height * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.275, 48]} /><meshPhysicalMaterial color="#7cb9c9" metalness={0.25} roughness={0.08} transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
  </group>;
}
