import { useState } from 'react';
import { Claim } from '../../components/Claim.tsx';
import { THESIS } from '../../data/thesis.ts';
import { fmt } from '../../lib/format.ts';
import { useCanvas } from '../../lib/useCanvas.ts';

export function SpeedupCurve() {
  const [selected, setSelected] = useState(1);
  const points = THESIS.videopimae;
  const point = points[selected] ?? points[0];

  const { wrap, canvas } = useCanvas((ctx, w, h) => {
    ctx.fillStyle = '#0c1014';
    ctx.fillRect(0, 0, w, h);
    const padL = 56;
    const padR = 60;
    const padT = 26;
    const padB = 44;
    const xMin = 70;
    const xMax = 100;
    const yMin = 9;
    const yMax = 19;
    const xOf = (pct: number): number => padL + ((pct - xMin) / (xMax - xMin)) * (w - padL - padR);
    const yOf = (db: number): number => h - padB - ((db - yMin) / (yMax - yMin)) * (h - padT - padB);
    const yOfS = (ssim: number): number =>
      h - padB - ((ssim - 0.15) / (0.75 - 0.15)) * (h - padT - padB);

    ctx.strokeStyle = 'rgba(236, 228, 212, 0.16)';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, h - padB);
    ctx.lineTo(w - padR, h - padB);
    ctx.stroke();

    ctx.fillStyle = '#6d6558';
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (const p of points) ctx.fillText(`${p.maskPct}%`, xOf(p.maskPct), h - padB + 16);
    ctx.fillText('physical MEMS masking (skipped pixels)', (padL + w - padR) / 2, h - 10);
    ctx.textAlign = 'right';
    for (const db of [10, 12, 14, 16, 18]) ctx.fillText(`${db} dB`, padL - 6, yOf(db) + 3);
    ctx.save();
    ctx.translate(14, (padT + h - padB) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('PSNR (dB)', 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(w - 12, (padT + h - padB) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('SSIM', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';
    for (const s of [0.2, 0.4, 0.6]) ctx.fillText(fmt(s, 2), w - padR + 8, yOfS(s) + 3);

    // Static PAT reference in the same unified image space.
    const patY = yOf(THESIS.unifiedStatic.pat.psnrDb);
    ctx.strokeStyle = 'rgba(236, 228, 212, 0.3)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(padL, patY);
    ctx.lineTo(w - padR, patY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9a8f7a';
    ctx.fillText('static PAT · 17.37 dB', padL + 8, patY - 5);

    // PSNR curve.
    ctx.strokeStyle = 'rgba(245, 185, 66, 0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xOf(p.maskPct);
      const y = yOf(p.psnrDb);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // SSIM curve.
    ctx.strokeStyle = 'rgba(94, 200, 229, 0.85)';
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xOf(p.maskPct);
      const y = yOfS(p.ssim);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    points.forEach((p, i) => {
      const active = i === selected;
      ctx.fillStyle = active ? '#f5b942' : 'rgba(245, 185, 66, 0.55)';
      ctx.beginPath();
      ctx.arc(xOf(p.maskPct), yOf(p.psnrDb), active ? 4.4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = active ? '#5ec8e5' : 'rgba(94, 200, 229, 0.55)';
      ctx.beginPath();
      ctx.arc(xOf(p.maskPct), yOfS(p.ssim), active ? 4.4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9a8f7a';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.speedup}×`, xOf(p.maskPct), yOf(p.psnrDb) - 12);
    });
  });

  if (point === undefined) return null;

  return (
    <div className="viz">
      <div className="viz-stage" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <div className="claims">
        <Claim symbol="mask" value={`${point.maskPct}%`} note={`${point.speedup}× frame-rate gain`} />
        <Claim symbol="PSNR" value={fmt(point.psnrDb, 4)} unit="dB" note="4-scene average, Table 5.1" />
        <Claim symbol="SSIM" value={fmt(point.ssim, 3)} note="unified magma image space" />
        <Claim
          symbol="tokens"
          value={point.maskPct === 98 ? '32 / 1568' : point.maskPct === 95 ? '80 / 1568' : point.maskPct === 90 ? '160 / 1568' : '392 / 1568'}
          note="spacetime tokens visible to encoder"
        />
      </div>
      <div className="controls">
        <div className="preset-row">
          {points.map((p, i) => (
            <button
              key={p.maskPct}
              type="button"
              className={i === selected ? 'on' : undefined}
              onClick={() => setSelected(i)}
            >
              {p.maskPct}% · {p.speedup}×
            </button>
          ))}
        </div>
      </div>
      <figure className="fig fig-light">
        <img
          src={`/thesis/bike-${point.maskPct}.jpg`}
          alt={`VideoPIMAE bicycle reconstruction at ${point.maskPct}% physical MEMS masking`}
          loading="lazy"
        />
        <figcaption>
          The real measurement at {point.maskPct}% masking (thesis Ch. 6, bicycle scene, 16
          frames): sparse single-photon scan (top), VideoPIMAE reconstruction (middle), fully
          sampled ground truth (bottom) — the ground truth took {point.speedup}× longer to
          acquire.
        </figcaption>
      </figure>
      <p className="viz-caption">
        VideoPIMAE: a public VideoMAE ViT-L/16 checkpoint, never fine-tuned on LiDAR, with its
        random mask replaced by the physical MEMS keep set. Useful at 4–10× (SSIM ≳ 0.48); the 50×
        point is the thesis stress test, where fine detail is lost but gross structure and motion
        survive. All values from Tables 5.1 and 6.1.
      </p>
    </div>
  );
}
