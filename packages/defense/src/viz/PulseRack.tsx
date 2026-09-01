import { useRef } from 'react';
import { PAPER } from '../data/paper.ts';
import { clear, sizeCanvas } from './canvas.ts';
import { useRaf } from './useRaf.ts';

const W = 560;
const H = 300;

const CHANNELS = [
  { name: 'Rearrange AWG  (2 ch)', color: '#8ec8ff', pattern: [0.05, 0.22, 0.55, 0.7] },
  { name: 'Rydberg AWG  (2 ch)', color: '#c9a0ff', pattern: [0.28, 0.3, 0.62, 0.64] },
  { name: 'Raman AWG  (4 ch, IQ 6.8 GHz)', color: '#5ec8e5', pattern: [0.12, 0.18, 0.4, 0.48, 0.72, 0.8] },
  { name: 'Raman AOD AWG  (2 ch)', color: '#e8a64b', pattern: [0.12, 0.2, 0.4, 0.5] },
  { name: 'Moving AOD AWG  (2 ch)', color: '#f3d48a', pattern: [0.0, 0.26, 0.5, 0.78] },
] as const;

export function PulseRack() {
  const ref = useRef<HTMLCanvasElement>(null);

  useRaf((t) => {
    const canvas = ref.current;
    if (canvas === null) return;
    const ctx = sizeCanvas(canvas, W, H);
    clear(ctx, W, H);
    const cycle = ((t / 1000) * 0.35) % 1;
    const left = 210;
    const width = 330;
    ctx.font = '11px "IBM Plex Mono", monospace';
    CHANNELS.forEach((ch, i) => {
      const y = 36 + i * 48;
      ctx.fillStyle = '#c9b896';
      ctx.fillText(ch.name, 12, y + 14);
      ctx.fillStyle = '#1a222a';
      ctx.fillRect(left, y, width, 28);
      for (let k = 0; k + 1 < ch.pattern.length; k += 2) {
        const a = ch.pattern[k] ?? 0;
        const b = ch.pattern[k + 1] ?? a;
        ctx.fillStyle = ch.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(left + a * width, y + 4, Math.max(2, (b - a) * width), 20);
        ctx.globalAlpha = 1;
      }
      const play = left + cycle * width;
      ctx.strokeStyle = '#a51c30';
      ctx.beginPath();
      ctx.moveTo(play, y - 4);
      ctx.lineTo(play, y + 32);
      ctx.stroke();
    });
    ctx.fillStyle = '#7d8b99';
    ctx.fillText(`<${PAPER.control.jitterNs} ns sync  ·  Spectrum AWGs  ·  27-layer memory loop`, 12, 286);
  });

  return (
    <div className="board">
      <canvas ref={ref} width={W} height={H} />
      <p className="board-cap">
        Five AWGs write the entire circuit. Moving / Rydberg / Raman-AOD segments loop; the Raman IQ waveform is streamed whole so the 6.8 GHz phase reference stays continuous. Memory, not physics, capped the experiment at 27 layers / 1.1 s.
      </p>
    </div>
  );
}
