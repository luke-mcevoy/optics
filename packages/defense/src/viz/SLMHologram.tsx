import { useCallback, useMemo, useState } from 'react';
import { sampleOrbital, worldScale } from '../physics/orbitals.ts';
import { AtomCloudField } from '../viz3d/AtomCloud.tsx';
import { TweezerBeam } from '../viz3d/Optics.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';
import { fft2d, fftShiftIndex } from './canvas.ts';

const N = 64;
type Spot = { x: number; y: number };

const START: Spot[] = [
  { x: -12, y: -8 },
  { x: 0, y: -8 },
  { x: 12, y: -8 },
  { x: -12, y: 8 },
  { x: 0, y: 8 },
  { x: 12, y: 8 },
];

export function SLMHologram() {
  const [spots, setSpots] = useState<Spot[]>(START);
  const fields = useMemo(() => computeHologram(spots), [spots]);
  const local = useMemo(() => sampleOrbital({ n: 5, l: 0, count: 1400, seed: 3 }), []);
  const scale = worldScale(5, 0.7);
  const sites = useMemo(
    () =>
      spots.map((s) => ({
        position: [s.x * 0.12, 0, s.y * 0.12] as [number, number, number],
        color: '#f5b942',
      })),
    [spots],
  );

  const addSpot = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width - 0.5) * N);
    const y = Math.round(((event.clientY - rect.top) / rect.height - 0.5) * N);
    setSpots((cur) => {
      const hit = cur.findIndex((s) => Math.abs(s.x - x) < 3 && Math.abs(s.y - y) < 3);
      if (hit >= 0) return cur.filter((_, i) => i !== hit);
      return [...cur, { x, y }];
    });
  }, []);

  return (
    <div className="board">
      <Stage3D
        camera={[0, 3.6, 7.2]}
        lookingAt="Holographic tweezers holding atoms"
        keys={[
          { color: '#1a2430', label: 'Dark slab above — the SLM (phase mask), hugely not to scale' },
          { color: '#f5b942', label: 'Amber cones — trap foci after the Fourier lens' },
          { color: '#f5b942', label: 'Gold knots — one atom sitting in each focus' },
        ]}
        note="Click the |E|² map below to add or remove a trap. The 3D view is the same list of sites."
        caption="Ideal phase-only Fourier construction. Not Hamamatsu pixels, not Gerchberg–Saxton iterations."
      >
        {sites.map((site, i) => (
          <TweezerBeam key={i} position={site.position} length={3.2} waist={0.1} />
        ))}
        <AtomCloudField local={local} sites={sites} scale={scale} size={0.03} />
        <mesh position={[0, 3.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 2.4]} />
          <meshBasicMaterial color="#1a2430" transparent opacity={0.35} />
        </mesh>
      </Stage3D>
      <div className="holo-row">
        <FieldView title="SLM phase φ(x,y)" data={fields.phase} kind="phase" />
        <FieldView title="Focal-plane |E|² — click traps" data={fields.intensity} kind="int" onClick={addSpot} />
      </div>
    </div>
  );
}

function computeHologram(spots: Spot[]): { phase: Float32Array; intensity: Float32Array } {
  const re = new Float64Array(N * N);
  const im = new Float64Array(N * N);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const u = x - N / 2;
      const v = y - N / 2;
      let sr = 0;
      let si = 0;
      for (const s of spots) {
        const ang = (-2 * Math.PI * (s.x * u + s.y * v)) / N;
        sr += Math.cos(ang);
        si += Math.sin(ang);
      }
      const mag = Math.hypot(sr, si) || 1;
      const i = y * N + x;
      re[i] = sr / mag;
      im[i] = si / mag;
    }
  }
  const phase = new Float32Array(N * N);
  for (let i = 0; i < N * N; i += 1) phase[i] = Math.atan2(im[i] ?? 0, re[i] ?? 0);
  fft2d(re, im, N, false);
  const intensity = new Float32Array(N * N);
  let max = 1e-12;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const sx = fftShiftIndex(x, N);
      const sy = fftShiftIndex(y, N);
      const val = (re[sy * N + sx] ?? 0) ** 2 + (im[sy * N + sx] ?? 0) ** 2;
      intensity[y * N + x] = val;
      if (val > max) max = val;
    }
  }
  for (let i = 0; i < intensity.length; i += 1) intensity[i] = (intensity[i] ?? 0) / max;
  return { phase, intensity };
}

function FieldView({
  title,
  data,
  kind,
  onClick,
}: {
  title: string;
  data: Float32Array;
  kind: 'phase' | 'int';
  onClick?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
}) {
  return (
    <figure className="field">
      <FieldCanvas data={data} kind={kind} {...(onClick !== undefined ? { onClick } : {})} />
      <figcaption>{title}</figcaption>
    </figure>
  );
}

function FieldCanvas({
  data,
  kind,
  onClick,
}: {
  data: Float32Array;
  kind: 'phase' | 'int';
  onClick?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
}) {
  const refCallback = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node === null) return;
      const ctx = node.getContext('2d');
      if (ctx === null) return;
      const img = ctx.createImageData(N, N);
      for (let i = 0; i < N * N; i += 1) {
        const v = data[i] ?? 0;
        const o = i * 4;
        if (kind === 'phase') {
          const hue = (v + Math.PI) / (2 * Math.PI);
          const [r, g, b] = hsl(hue, 0.55, 0.42);
          img.data[o] = r;
          img.data[o + 1] = g;
          img.data[o + 2] = b;
          img.data[o + 3] = 255;
        } else {
          const g = Math.min(255, Math.round(255 * v ** 0.45));
          img.data[o] = 255;
          img.data[o + 1] = 180 + Math.round(0.2 * g);
          img.data[o + 2] = 40;
          img.data[o + 3] = 40 + g;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    [data, kind],
  );
  return (
    <canvas
      ref={refCallback}
      width={N}
      height={N}
      className="field-canvas"
      {...(onClick !== undefined ? { onClick } : {})}
    />
  );
}

function hsl(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}
