import { useMemo, useRef, useState } from 'react';
import { Figure, Panel } from '../components/Figure.tsx';
import { Slider } from '../components/Slider.tsx';
import { PAPER } from '../data/paper.ts';
import { clear, sizeCanvas } from './canvas.ts';
import { useRaf } from './useRaf.ts';
import { integrateBlockade, N_PTS, TAU_MAX, type Curves } from '../physics/blockade.ts';

const W = 660;
const H = 280;

export function BlockadeDynamics() {
  const [vOverOmega, setVOverOmega] = useState(12);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const curves = useMemo(() => integrateBlockade(vOverOmega), [vOverOmega]);
  const maxRr = useMemo(() => {
    let m = 0;
    for (let i = 0; i < N_PTS; i += 1) m = Math.max(m, curves.rr[i] ?? 0);
    return m;
  }, [curves]);

  useRaf((nowMs) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const cursor = ((nowMs / 1000) * 0.55) % 1;
    draw(canvas, curves, cursor);
  }, true, canvasRef);

  return (
    <Figure
      n="6"
      title="Blockade dynamics: the pair shares one excitation"
      caption={
        <>
          Populations of two driven atoms, from integrating the Schrödinger equation in the
          symmetric subspace (|gg⟩, |W⟩ = (|gr⟩+|rg⟩)/√2, |rr⟩) with both atoms resonantly
          driven at Ω and the doubly excited state shifted by V. At V = 0 the atoms are
          independent and |rr⟩ fills up (P<sub>rr</sub> = sin⁴(Ωt/2)). As V/Ω grows, |rr⟩ is
          frozen out — with the slider at V/Ω = {vOverOmega.toFixed(1)}, its peak population is{' '}
          {maxRr.toFixed(3)} — and the pair oscillates between |gg⟩ and the shared single
          excitation |W⟩ at the enhanced rate √2 Ω. That missing |rr⟩ amplitude is the
          blockade; the conditional phase the pair picks up instead is the CZ gate. The paper
          drives at Ω<sub>Ryd</sub> = {PAPER.rydberg.rabiMHz} MHz with atoms ~2 μm apart (the pair spacing of its ref. 36; this paper does not restate it), where
          V/Ω is far beyond the top of this slider — deeper into blockade than shown here.
        </>
      }
    >
      <Panel tag="a" title="Two-atom populations under resonant drive" wide>
        <Slider
          label="blockade strength V/Ω"
          value={vOverOmega}
          min={0}
          max={20}
          step={0.5}
          display={vOverOmega.toFixed(1)}
          onChange={setVOverOmega}
        />
        <canvas ref={canvasRef} className="sketch" />
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, curves: Curves, cursorFrac: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const px = 46;
  const py = 26;
  const pw = W - px - 16;
  const ph = H - py - 44;
  const mono = '11px IBM Plex Mono, monospace';

  ctx.strokeStyle = '#2a2b2e';
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = '#9b9790';
  ctx.font = mono;
  ctx.fillText('1', px - 14, py + 8);
  ctx.fillText('0', px - 14, py + ph + 4);
  ctx.fillText('population', px, py - 8);
  for (let k = 2; k <= 8; k += 2) {
    const x = px + (k / 8) * pw;
    ctx.strokeStyle = '#1d1e20';
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x, py + ph);
    ctx.stroke();
    ctx.fillStyle = '#9b9790';
    ctx.fillText(`${k}π`, x - 8, py + ph + 16);
  }
  ctx.fillText('pulse area Ωt', px + pw / 2 - 40, py + ph + 32);

  const series: { data: Float64Array; color: string; label: string }[] = [
    { data: curves.gg, color: '#d4a24a', label: 'P(gg)' },
    { data: curves.w, color: '#6ea8d4', label: 'P(W) one shared excitation' },
    { data: curves.rr, color: '#c81e1e', label: 'P(rr) doubly excited' },
  ];
  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < N_PTS; i += 1) {
      const x = px + (i / (N_PTS - 1)) * pw;
      const y = py + ph - (s.data[i] ?? 0) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  let lx = px + 8;
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillText(s.label, lx, py + 14);
    lx += ctx.measureText(s.label).width + 18;
  }

  const ci = Math.floor(cursorFrac * (N_PTS - 1));
  const cxp = px + (ci / (N_PTS - 1)) * pw;
  ctx.strokeStyle = 'rgba(244, 241, 234, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cxp, py);
  ctx.lineTo(cxp, py + ph);
  ctx.stroke();
  for (const s of series) {
    const y = py + ph - (s.data[ci] ?? 0) * ph;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(cxp, y, 3.5, 0, 2 * Math.PI);
    ctx.fill();
  }
}
