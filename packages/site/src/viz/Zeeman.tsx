import { useMemo, useState } from 'react';
import { Claim } from '../components/Claim.tsx';
import { Slider } from '../components/Slider.tsx';
import { fmt } from '../lib/format.ts';
import { useCanvas } from '../lib/useCanvas.ts';

/** Bohr magneton in eV/T (CODATA). */
const MU_B_EV_PER_T = 5.7883818066e-5;

export function Zeeman() {
  const [bT, setBT] = useState(1.2);
  const splitMeV = useMemo(() => MU_B_EV_PER_T * bT * 1e3, [bT]);
  const { wrap, canvas } = useCanvas((ctx, w, h) => {
    ctx.fillStyle = '#0c1014';
    ctx.fillRect(0, 0, w, h);
    const padL = 52;
    const padR = 28;
    const padT = 24;
    const padB = 36;
    const levels = [-1, 0, 1];
    const eMax = MU_B_EV_PER_T * 2.2 * 1.15;
    const x0 = padL;
    const x1 = w - padR;
    const yOf = (e: number): number => {
      const mid = (h - padT - padB) / 2 + padT;
      return mid - (e / eMax) * ((h - padT - padB) / 2 - 8);
    };

    ctx.strokeStyle = 'rgba(236, 228, 212, 0.16)';
    ctx.beginPath();
    ctx.moveTo(x0, padT);
    ctx.lineTo(x0, h - padB);
    ctx.lineTo(x1, h - padB);
    ctx.stroke();

    ctx.fillStyle = '#6d6558';
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('B', (x0 + x1) / 2, h - 12);
    ctx.save();
    ctx.translate(16, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('E', 0, 0);
    ctx.restore();

    const colors = ['#5ec8e5', '#ece4d4', '#f5b942'];
    for (let i = 0; i < levels.length; i += 1) {
      const m = levels[i] ?? 0;
      ctx.beginPath();
      ctx.moveTo(x0, yOf(0));
      ctx.lineTo(x1, yOf(MU_B_EV_PER_T * m * 2.2));
      ctx.strokeStyle = colors[i] ?? '#ece4d4';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      const eNow = MU_B_EV_PER_T * m * bT;
      const xNow = x0 + (bT / 2.2) * (x1 - x0);
      ctx.fillStyle = colors[i] ?? '#ece4d4';
      ctx.beginPath();
      ctx.arc(xNow, yOf(eNow), 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillText(`mℓ = ${m > 0 ? '+' : ''}${m}`, x1 - 54, yOf(MU_B_EV_PER_T * m * 2.2) - 6);
    }
  });

  return (
    <div className="viz">
      <div className="viz-stage" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <div className="claims">
        <Claim symbol="ΔE" value={fmt(splitMeV)} unit="meV" note="μB B between adjacent mℓ" />
        <Claim symbol="B" value={fmt(bT)} unit="T" />
        <Claim symbol="μB" value="5.788×10⁻⁵" unit="eV/T" note="CODATA" />
      </div>
      <div className="controls">
        <Slider label="magnetic field" value={bT} min={0} max={2.2} step={0.02} unit="T" onChange={setBT} />
      </div>
    </div>
  );
}
