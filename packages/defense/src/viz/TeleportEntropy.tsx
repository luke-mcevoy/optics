import { useRef } from 'react';
import { PAPER } from '../data/paper.ts';
import { clear, sizeCanvas } from './canvas.ts';
import { useRaf } from './useRaf.ts';

const W = 560;
const H = 280;

export function TeleportEntropy() {
  const ref = useRef<HTMLCanvasElement>(null);

  useRaf((t) => {
    const canvas = ref.current;
    if (canvas === null) return;
    const ctx = sizeCanvas(canvas, W, H);
    clear(ctx, W, H);
    const time = t / 1000;
    const layer = Math.floor(time * 0.6) % 8;
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#c9b896';
    ctx.fillText(`layer ${layer + 1} / ${PAPER.deep.layers}  ·  A encodes, B is measured, physical junk stays behind`, 16, 24);

    for (let i = 0; i < 8; i += 1) {
      const x = 40 + i * 64;
      const activeA = i % 2 === layer % 2;
      ctx.fillStyle = activeA ? '#2a1830' : '#1a222a';
      ctx.fillRect(x, 50, 50, 90);
      ctx.strokeStyle = activeA ? '#c9a0ff' : '#2c3640';
      ctx.strokeRect(x, 50, 50, 90);
      ctx.fillStyle = activeA ? '#c9a0ff' : '#7d8b99';
      ctx.fillText(activeA ? 'A live' : 'B meas.', x + 6, 70);
      const err = 0.15 + 0.05 * Math.sin(time * 3 + i);
      ctx.fillStyle = `rgba(165,28,48,${activeA ? 0.15 : err})`;
      ctx.fillRect(x + 8, 88, 34, 40);
      ctx.fillStyle = '#e8dfc8';
      ctx.fillText(activeA ? 'ψ_L' : 'reset', x + 10, 112);
    }

    ctx.fillStyle = '#8ec8ff';
    ctx.fillRect(40, 170, 480 * Math.min(1, (layer + 1) / 8), 12);
    ctx.fillStyle = '#7d8b99';
    ctx.fillText('logical correlations persist in time', 40, 204);
    ctx.fillStyle = '#a51c30';
    ctx.fillRect(40, 220, 80 / (1 + layer * 0.7), 12);
    ctx.fillStyle = '#7d8b99';
    ctx.fillText('physical error correlations decay after teleportation', 40, 254);
  });

  return (
    <div className="board">
      <canvas ref={ref} width={W} height={H} />
      <p className="board-cap">
        Transversal teleportation is both a logical gate and a leakage-reduction unit. The paper keeps 32 Steane blocks, then [[16,6,4]] blocks, at constant detector error until the reservoir empties.
      </p>
    </div>
  );
}
