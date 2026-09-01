import { useState } from 'react';
import { Claim } from '../../components/Claim.tsx';
import { modeCount, THESIS } from '../../data/thesis.ts';
import { fmt } from '../../lib/format.ts';
import { useCanvas } from '../../lib/useCanvas.ts';

/** Log-scale axes for the time-frequency plane. */
const T_MIN = 1e-12;
const T_MAX = 3e-9;
const B_MIN = 5e9;
const B_MAX = 6e11;

export function QpmsModes() {
  const [logT, setLogT] = useState(Math.log10(THESIS.qpms.qpms.gateS));
  const [logB, setLogB] = useState(Math.log10(THESIS.qpms.qpms.bandHz));
  const gateS = 10 ** logT;
  const bandHz = 10 ** logB;

  const nWindow = modeCount(bandHz, gateS);
  const nInGaAs = modeCount(THESIS.qpms.ingaas.bandHz, THESIS.qpms.ingaas.gateS);
  // Thesis convention: round the acceptance up to one mode before the ratio.
  const advantageDb = 10 * Math.log10(nInGaAs / Math.max(nWindow, 1));

  const { wrap, canvas } = useCanvas((ctx, w, h) => {
    ctx.fillStyle = '#0c1014';
    ctx.fillRect(0, 0, w, h);
    const padL = 56;
    const padR = 24;
    const padT = 26;
    const padB = 44;
    const xOf = (tSec: number): number =>
      padL + ((Math.log10(tSec) - Math.log10(T_MIN)) / (Math.log10(T_MAX) - Math.log10(T_MIN))) * (w - padL - padR);
    const yOf = (bHz: number): number =>
      h - padB - ((Math.log10(bHz) - Math.log10(B_MIN)) / (Math.log10(B_MAX) - Math.log10(B_MIN))) * (h - padT - padB);

    ctx.strokeStyle = 'rgba(236, 228, 212, 0.16)';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, h - padB);
    ctx.lineTo(w - padR, h - padB);
    ctx.stroke();

    ctx.fillStyle = '#6d6558';
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (const tSec of [1e-12, 1e-11, 1e-10, 1e-9]) {
      ctx.fillText(tSec >= 1e-9 ? '1 ns' : `${fmt(tSec * 1e12, 2)} ps`, xOf(tSec), h - padB + 16);
    }
    ctx.textAlign = 'right';
    for (const bHz of [1e10, 1e11]) {
      ctx.fillText(`${fmt(bHz / 1e9, 3)} GHz`, padL - 6, yOf(bHz) + 3);
    }
    ctx.textAlign = 'center';
    ctx.fillText('detection gate T', (padL + w - padR) / 2, h - 10);
    ctx.save();
    ctx.translate(14, (padT + h - padB) / 2 + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('bandwidth B', 0, 0);
    ctx.restore();

    // InGaAs window (fixed reference).
    const gx0 = xOf(T_MIN);
    const gy1 = yOf(B_MIN);
    const ix = xOf(THESIS.qpms.ingaas.gateS);
    const iy = yOf(THESIS.qpms.ingaas.bandHz);
    ctx.fillStyle = 'rgba(236, 228, 212, 0.07)';
    ctx.fillRect(gx0, iy, ix - gx0, gy1 - iy);
    ctx.strokeStyle = 'rgba(236, 228, 212, 0.4)';
    ctx.strokeRect(gx0, iy, ix - gx0, gy1 - iy);
    ctx.fillStyle = '#9a8f7a';
    ctx.textAlign = 'left';
    ctx.fillText('InGaAs · 1 ns × 250 GHz · N ≈ 392', gx0 + 8, iy - 6);

    // Adjustable window.
    const qx = xOf(gateS);
    const qy = yOf(bandHz);
    ctx.fillStyle = 'rgba(245, 185, 66, 0.22)';
    ctx.fillRect(gx0, qy, qx - gx0, gy1 - qy);
    ctx.strokeStyle = 'rgba(245, 185, 66, 0.95)';
    ctx.strokeRect(gx0, qy, qx - gx0, gy1 - qy);
    ctx.fillStyle = '#f5b942';
    ctx.fillText(
      `window · ${fmt(gateS * 1e12, 3)} ps × ${fmt(bandHz / 1e9, 3)} GHz`,
      Math.min(qx + 8, w - 210),
      qy - 6,
    );
  });

  return (
    <div className="viz">
      <div className="viz-stage" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <div className="claims">
        <Claim symbol="N" value={fmt(nWindow, 3)} note="modes, πBT/2 (Eq. 3.7.1)" />
        <Claim
          symbol="10·log₁₀"
          value={fmt(advantageDb, 3)}
          unit="dB"
          note="mode-count gain vs InGaAs (≥1-mode rounding)"
        />
        <Claim symbol="+3.0 dB" value="polarization" note="thesis Fig. 3.9" />
        <Claim symbol="+7.1 dB" value="mode sorting" note="→ 36 dB total (Fig. 3.9)" />
      </div>
      <div className="controls controls-2">
        <label className="slider">
          <span className="slider-row">
            <span>detection gate</span>
            <span className="slider-val">{fmt(gateS * 1e12, 3)} ps</span>
          </span>
          <input
            type="range"
            min={Math.log10(T_MIN)}
            max={Math.log10(T_MAX)}
            step={0.01}
            value={logT}
            onChange={(event) => setLogT(Number(event.target.value))}
          />
        </label>
        <label className="slider">
          <span className="slider-row">
            <span>bandwidth</span>
            <span className="slider-val">{fmt(bandHz / 1e9, 3)} GHz</span>
          </span>
          <input
            type="range"
            min={Math.log10(B_MIN)}
            max={Math.log10(B_MAX)}
            step={0.01}
            value={logB}
            onChange={(event) => setLogB(Number(event.target.value))}
          />
        </label>
      </div>
      <p className="viz-caption">
        Defaults are the QPMS acceptance: 6 ps × 90 GHz → N ≈ 0.85, rounded up to one mode in the
        thesis, giving 25.9 dB from mode count alone. Polarization (+3.0 dB) and intrinsic mode
        selectivity (+7.1 dB) bring the published advantage to 36 dB over direct InGaAs detection.
        The QPMS detector itself: 84% conversion, 11.3 dB pairwise selectivity, ~9 ps timing,
        0.9 mm single-shot depth (all inherited platform values, Ch. 3).
      </p>
    </div>
  );
}
