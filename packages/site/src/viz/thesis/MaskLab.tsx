import { useMemo, useRef, useState } from 'react';
import { Claim } from '../../components/Claim.tsx';
import { Slider } from '../../components/Slider.tsx';
import { fmt } from '../../lib/format.ts';
import { useCanvas } from '../../lib/useCanvas.ts';
import {
  createSolver,
  depthColor,
  GRID,
  makeMask,
  makeScene,
  type MaskPattern,
} from './maskSolver.ts';

const PATTERNS: readonly { id: MaskPattern; label: string }[] = [
  { id: 'random', label: 'Random' },
  { id: 'lissajous', label: 'Lissajous' },
  { id: 'spiral', label: 'Spiral' },
];

export function MaskLab() {
  const [pattern, setPattern] = useState<MaskPattern>('random');
  const [maskPct, setMaskPct] = useState(90);
  const [psnr, setPsnr] = useState(0);

  const scene = useMemo(() => makeScene(), []);
  const mask = useMemo(() => makeMask(pattern, maskPct, 11), [pattern, maskPct]);
  const solver = useMemo(() => createSolver(scene, mask), [scene, mask]);
  const kept = useMemo(() => mask.reduce<number>((acc, v) => acc + v, 0), [mask]);
  const psnrRef = useRef(0);

  const { wrap, canvas } = useCanvas((ctx, w, h) => {
    if (!solver.converged()) solver.sweep(20);
    const p = solver.psnr();
    if (Math.abs(p - psnrRef.current) > 0.05) {
      psnrRef.current = p;
      setPsnr(p);
    }

    ctx.fillStyle = '#0c1014';
    ctx.fillRect(0, 0, w, h);
    const gap = 12;
    const labelH = 20;
    const cell = Math.min((w - gap * 3 - 24) / 4, h - labelH - 16);
    const y0 = labelH + (h - labelH - cell) / 2 - 4;
    const x0 = (w - cell * 4 - gap * 3) / 2;
    const panels: readonly { title: string; draw: (px: number) => void }[] = [
      {
        title: 'scene (truth)',
        draw: (px) => drawField(ctx, scene, px, y0, cell, null),
      },
      {
        title: `MEMS keep set (${fmt((kept / (GRID * GRID)) * 100, 3)}%)`,
        draw: (px) => drawMask(ctx, mask, px, y0, cell),
      },
      {
        title: 'sparse measurement',
        draw: (px) => drawField(ctx, scene, px, y0, cell, mask),
      },
      {
        title: 'biharmonic recon',
        draw: (px) => drawField(ctx, solver.u, px, y0, cell, null),
      },
    ];
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    panels.forEach((panel, k) => {
      const px = x0 + k * (cell + gap);
      ctx.fillStyle = '#6d6558';
      ctx.fillText(panel.title, px, y0 - 7);
      panel.draw(px);
    });
  });

  const speedup = (GRID * GRID) / Math.max(1, kept);

  return (
    <div className="viz">
      <div className="viz-stage viz-wide" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <div className="claims">
        <Claim
          symbol="kept"
          value={String(kept)}
          note={`of ${GRID * GRID} pixels physically scanned`}
        />
        <Claim symbol="speed-up" value={`${fmt(speedup, 3)}×`} note="acquisition-time factor" />
        <Claim
          symbol="PSNR"
          value={Number.isFinite(psnr) ? fmt(psnr, 4) : '—'}
          unit="dB"
          note="recon vs truth, computed live"
        />
        <Claim symbol="Δ²u" value="= 0" note="Ch. 5 solve, no training" />
      </div>
      <div className="controls controls-2">
        <Slider
          label="masking (skipped pixels)"
          value={maskPct}
          min={50}
          max={98}
          step={1}
          unit="%"
          onChange={setMaskPct}
        />
        <div className="preset-row">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === pattern ? 'on' : undefined}
              onClick={() => setPattern(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <p className="viz-caption">
        The reconstruction is a live Gauss–Seidel solve of the Chapter 5 biharmonic equation on a
        synthetic depth scene — you can watch it converge. Structured scans (Lissajous, spiral)
        may keep fewer pixels than the budget; the claim shows the actual count. On the thesis
        LiDAR benchmark the same solver averages 16.95 dB PSNR vs PAT’s 17.37 dB (Table 5.1).
      </p>
    </div>
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  field: Float64Array,
  x0: number,
  y0: number,
  size: number,
  mask: Uint8Array | null,
): void {
  const s = size / GRID;
  ctx.fillStyle = '#10151a';
  ctx.fillRect(x0, y0, size, size);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const i = y * GRID + x;
      if (mask !== null && mask[i] === 0) continue;
      ctx.fillStyle = depthColor(field[i] ?? 0);
      ctx.fillRect(x0 + x * s, y0 + y * s, s + 0.4, s + 0.4);
    }
  }
}

function drawMask(
  ctx: CanvasRenderingContext2D,
  mask: Uint8Array,
  x0: number,
  y0: number,
  size: number,
): void {
  const s = size / GRID;
  ctx.fillStyle = '#10151a';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = 'rgba(94, 200, 229, 0.9)';
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (mask[y * GRID + x] === 1) {
        ctx.fillRect(x0 + x * s, y0 + y * s, s + 0.4, s + 0.4);
      }
    }
  }
}
