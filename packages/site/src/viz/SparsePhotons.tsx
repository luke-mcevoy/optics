import { useEffect, useMemo, useState } from 'react';
import { Claim } from '../components/Claim.tsx';
import { Slider } from '../components/Slider.tsx';
import { fmt } from '../lib/format.ts';
import { useCanvas } from '../lib/useCanvas.ts';

const N = 72;

function glyphDensity(): Float64Array {
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return new Float64Array(N * N);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, N, N);
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(N * 0.7)}px "Instrument Serif", "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('π', N / 2, N / 2 + N * 0.04);
  const pix = ctx.getImageData(0, 0, N, N).data;
  const g = new Float64Array(N * N);
  for (let i = 0; i < N * N; i += 1) {
    g[i] = (pix[i * 4] ?? 0) / 255;
  }
  return g;
}

function sampleHits(density: Float64Array, count: number, seed: number): { x: number; y: number }[] {
  const cdf = new Float64Array(density.length);
  let acc = 0;
  for (let i = 0; i < density.length; i += 1) {
    acc += density[i] ?? 0;
    cdf[i] = acc;
  }
  const total = acc;
  if (total <= 0) return [];
  let s = seed >>> 0;
  const rand = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const hits: { x: number; y: number }[] = [];
  for (let k = 0; k < count; k += 1) {
    const u = rand() * total;
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((cdf[mid] ?? 0) < u) lo = mid + 1;
      else hi = mid;
    }
    const x = lo % N;
    const y = Math.floor(lo / N);
    hits.push({ x: x + rand() - 0.5, y: y + rand() - 0.5 });
  }
  return hits;
}

function kde(hits: { x: number; y: number }[], sigma: number): Float64Array {
  const field = new Float64Array(N * N);
  const r2 = (3 * sigma) ** 2;
  const inv = 1 / (2 * sigma * sigma);
  for (const hit of hits) {
    const x0 = Math.max(0, Math.floor(hit.x - 3 * sigma));
    const x1 = Math.min(N - 1, Math.ceil(hit.x + 3 * sigma));
    const y0 = Math.max(0, Math.floor(hit.y - 3 * sigma));
    const y1 = Math.min(N - 1, Math.ceil(hit.y + 3 * sigma));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const dx = x - hit.x;
        const dy = y - hit.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        field[y * N + x] = (field[y * N + x] ?? 0) + Math.exp(-d2 * inv);
      }
    }
  }
  return field;
}

export function SparsePhotons() {
  const [count, setCount] = useState(80);
  const [ready, setReady] = useState(false);
  const density = useMemo(() => (ready ? glyphDensity() : new Float64Array(N * N)), [ready]);
  const hits = useMemo(() => sampleHits(density, count, 7), [density, count]);
  const field = useMemo(() => kde(hits, 1.6), [hits]);

  useEffect(() => {
    setReady(true);
  }, []);

  const { wrap, canvas } = useCanvas((ctx, w, h) => {
    ctx.fillStyle = '#0c1014';
    ctx.fillRect(0, 0, w, h);
    const gap = 16;
    const cell = Math.min((w - gap) / 2, h) * 0.92;
    const y0 = (h - cell) / 2;
    const left = (w - cell * 2 - gap) / 2;
    const right = left + cell + gap;

    ctx.fillStyle = '#6d6558';
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('detected photons', left + cell / 2, y0 - 6);
    ctx.fillText('Gaussian KDE', right + cell / 2, y0 - 6);

    ctx.fillStyle = '#10151a';
    ctx.fillRect(left, y0, cell, cell);
    ctx.fillRect(right, y0, cell, cell);

    let max = 0;
    for (let i = 0; i < field.length; i += 1) max = Math.max(max, field[i] ?? 0);
    const scale = cell / N;
    if (max > 0) {
      for (let y = 0; y < N; y += 1) {
        for (let x = 0; x < N; x += 1) {
          const v = (field[y * N + x] ?? 0) / max;
          if (v < 0.02) continue;
          ctx.fillStyle = `rgba(245, 185, 66, ${0.12 + 0.88 * v})`;
          ctx.fillRect(right + x * scale, y0 + y * scale, scale + 0.4, scale + 0.4);
        }
      }
    }
    ctx.fillStyle = 'rgba(94, 200, 229, 0.9)';
    for (const hit of hits) {
      ctx.beginPath();
      ctx.arc(left + ((hit.x + 0.5) / N) * cell, y0 + ((hit.y + 0.5) / N) * cell, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return (
    <div className="viz">
      <div className="viz-stage viz-wide" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <div className="claims">
        <Claim symbol="N" value={fmt(count, 3)} note="sampled detections" />
        <Claim symbol="model" value="KDE" note="not the PI-MAE network" />
        <Claim symbol="glyph" value="π" note="fixed target" />
      </div>
      <div className="controls">
        <Slider label="detected photons" value={count} min={12} max={600} step={4} onChange={setCount} />
      </div>
    </div>
  );
}
