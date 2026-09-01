import { useMemo, useState } from 'react';
import { Claim } from '../../components/Claim.tsx';
import { THESIS } from '../../data/thesis.ts';
import { fmt } from '../../lib/format.ts';
import { useCanvas } from '../../lib/useCanvas.ts';

const PULSES_SHOWN = 3200;

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function timePerDetection(pDetect: number): string {
  if (pDetect <= 0) return '∞';
  const seconds = 1 / (pDetect * THESIS.laser.repRateHz);
  if (seconds < 1e-3) return `${fmt(seconds * 1e6)} μs`;
  if (seconds < 1) return `${fmt(seconds * 1e3)} ms`;
  return `${fmt(seconds)} s`;
}

export function PhotonBudget() {
  // Slider is log10 of the mean detections per pulse.
  const [logN, setLogN] = useState(Math.log10(THESIS.operatingPoints.qpmsDetPerPulse));
  const nBar = 10 ** logN;
  const pDetect = 1 - Math.exp(-nBar);

  const detected = useMemo(() => {
    const rand = mulberry(41);
    const hits: number[] = [];
    for (let i = 0; i < PULSES_SHOWN; i += 1) {
      if (rand() < pDetect) hits.push(i);
    }
    return new Set(hits);
  }, [pDetect]);

  const { wrap, canvas } = useCanvas((ctx, w, h, t) => {
    ctx.fillStyle = '#0c1014';
    ctx.fillRect(0, 0, w, h);
    const cols = 80;
    const rows = Math.ceil(PULSES_SHOWN / cols);
    const padX = 20;
    const padY = 26;
    const cw = (w - padX * 2) / cols;
    const ch = (h - padY * 2) / rows;
    const r = Math.max(0.8, Math.min(cw, ch) * 0.22);

    for (let i = 0; i < PULSES_SHOWN; i += 1) {
      const x = padX + (i % cols) * cw + cw / 2;
      const y = padY + Math.floor(i / cols) * ch + ch / 2;
      if (detected.has(i)) {
        const pulse = 0.75 + 0.25 * Math.sin(t * 0.006 + i);
        ctx.fillStyle = `rgba(245, 185, 66, ${pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(236, 228, 212, 0.13)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#6d6558';
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${PULSES_SHOWN.toLocaleString()} laser pulses · ${detected.size} produced a detection`,
      padX,
      14,
    );
  });

  const expected = pDetect * PULSES_SHOWN;

  return (
    <div className="viz">
      <div className="viz-stage" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <div className="claims">
        <Claim symbol="n̄" value={nBar.toExponential(2)} note="mean detections per pulse" />
        <Claim symbol="P(k≥1)" value={pDetect.toExponential(2)} note="1 − e⁻ⁿ̄, Poisson" />
        <Claim symbol="1/P" value={fmt(1 / Math.max(pDetect, 1e-12), 3)} note="pulses per detection" />
        <Claim symbol="t_det" value={timePerDetection(pDetect)} note="at 50 MHz repetition" />
      </div>
      <div className="controls controls-2">
        <label className="slider">
          <span className="slider-row">
            <span>mean detections per pulse</span>
            <span className="slider-val">
              10<sup>{fmt(logN, 3)}</sup>
            </span>
          </span>
          <input
            type="range"
            min={-7}
            max={0}
            step={0.01}
            value={logN}
            onChange={(event) => setLogN(Number(event.target.value))}
          />
        </label>
        <div className="preset-row">
          <button
            type="button"
            onClick={() => setLogN(Math.log10(THESIS.operatingPoints.pimaeDetPerPulse))}
          >
            PI-MAE · 1.86×10⁻⁶
          </button>
          <button
            type="button"
            onClick={() => setLogN(Math.log10(THESIS.operatingPoints.qpmsDetPerPulse))}
          >
            QPMS · 6×10⁻⁴
          </button>
        </div>
      </div>
      <p className="viz-caption">
        Expected detections in this panel: {fmt(expected, 3)} of {PULSES_SHOWN.toLocaleString()}{' '}
        pulses. The thesis operating points are n̄ = 1.86×10⁻⁶ (PI-MAE, Table 2.1) and n̄ ≈ 6×10⁻⁴
        (QPMS imager) — at the PI-MAE point, one detection per ~540,000 pulses.
      </p>
    </div>
  );
}
