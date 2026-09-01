import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { HOLE_PITCH, TABLE_LENGTH, TABLE_THICKNESS, TABLE_WIDTH } from '../scale.ts';

const makeSkin = (): THREE.CanvasTexture => {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('canvas 2d unavailable');

  ctx.fillStyle = '#3a3b42';
  ctx.fillRect(0, 0, width, height);

  const grain = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    grain.data[i] = clampByte((grain.data[i] ?? 0) + n);
    grain.data[i + 1] = clampByte((grain.data[i + 1] ?? 0) + n);
    grain.data[i + 2] = clampByte((grain.data[i + 2] ?? 0) + n * 0.9);
  }
  ctx.putImageData(grain, 0, 0);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(0, 0, width, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, height - 10, width, 10);

  const pitchX = width * (HOLE_PITCH / TABLE_LENGTH);
  const pitchY = height * (HOLE_PITCH / TABLE_WIDTH);
  const marginX = pitchX * 0.85;
  const marginY = pitchY * 0.85;
  for (let x = marginX; x < width - marginX; x += pitchX) {
    for (let y = marginY; y < height - marginY; y += pitchY) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 5.5);
      g.addColorStop(0, '#121318');
      g.addColorStop(0.55, '#1c1d24');
      g.addColorStop(1, 'rgba(58,59,66,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.arc(x - 0.8, y - 0.8, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};

export function OpticalTable() {
  const map = useMemo(makeSkin, []);
  useLayoutEffect(() => () => map.dispose(), [map]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -TABLE_THICKNESS / 2, 0]} receiveShadow>
        <boxGeometry args={[TABLE_LENGTH, TABLE_WIDTH, TABLE_THICKNESS]} />
        <meshStandardMaterial map={map} roughness={0.62} metalness={0.28} color="#f0f0f2" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -TABLE_THICKNESS - 0.02, 0]}>
        <boxGeometry args={[TABLE_LENGTH + 0.15, TABLE_WIDTH + 0.15, 0.08]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.9} metalness={0.05} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(TABLE_LENGTH / 2 - 1.1) * sx, -TABLE_THICKNESS - 1.15, (TABLE_WIDTH / 2 - 1.1) * sz]}
          >
            <cylinderGeometry args={[0.45, 0.55, 2.1, 20]} />
            <meshStandardMaterial color="#1b1b1e" roughness={0.55} metalness={0.4} />
          </mesh>
        )),
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -TABLE_THICKNESS - 2.35, 0]} receiveShadow>
        <circleGeometry args={[48, 64]} />
        <meshStandardMaterial color="#080809" roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[0, -TABLE_THICKNESS / 2 + 0.02, TABLE_WIDTH / 2 + 0.04]}>
        <boxGeometry args={[TABLE_LENGTH + 0.2, TABLE_THICKNESS + 0.08, 0.12]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.38} metalness={0.55} />
      </mesh>
    </group>
  );
}

const clampByte = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));
