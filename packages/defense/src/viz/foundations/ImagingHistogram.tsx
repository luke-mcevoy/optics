import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { collectionFraction } from '../../physics/beams.ts';
import { discriminationFidelity, imagingBudget } from '../../physics/cooling.ts';
import { poissonPmf } from '../../physics/formulas.ts';
import { tweezer } from '../../physics/light.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, MONO, MUTED, RED } from './bloch2d.ts';

const W = 660;
const H = 300;
const OPTICS = 0.5; // assumed transmission of the imaging path
const QE = 0.5; // assumed camera quantum efficiency at 780 nm (qCMOS, order of magnitude)
const BG_PER_MS = 0.4; // assumed background counts per ms

export function ImagingHistogram() {
  const [exposureMs, setExposureMs] = useState(2);
  const [sat, setSat] = useState(0.2);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const coll = collectionFraction(PAPER.imaging.na);
  const b = imagingBudget({ exposureS: exposureMs * 1e-3, s: sat, deltaRad: 0, collection: coll, optics: OPTICS, qe: QE });
  const mu0 = BG_PER_MS * exposureMs;
  const mu1 = mu0 + b.meanCounts;
  const disc = discriminationFidelity(mu0, mu1);
  const depthMK = -tweezer(852e-9, 4e-3, 1e-6).depthMK;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, mu0, mu1, disc.threshold, b.heatingMK, depthMK);
  }, [mu0, mu1, disc.threshold, b.heatingMK, depthMK]);

  return (
    <Figure
      n="F16"
      title="Seeing one atom: a photon budget and a heating budget"
      caption={
        <>
          Fluorescence imaging is counting photons. A single atom driven on the cycling
          transition scatters at R = (Γ/2)·s/(1+s) photons per second (Γ/2 ≈ 1.9 × 10⁷ s⁻¹ at
          saturation); an objective of numerical aperture {PAPER.imaging.na} collects the fraction
          (1 − cos θ)/2 = {(coll * 100).toFixed(0)}% of them; optics and camera quantum efficiency
          (assumed {OPTICS * 100}% and {QE * 100}%) take their cut. The result is a Poisson
          distribution of counts for &ldquo;atom&rdquo; versus one for &ldquo;no atom&rdquo; (background,
          assumed {BG_PER_MS}/ms); the best threshold between them sets the detection fidelity.
          The catch: every scattered photon heats the atom by two recoil energies, so the same
          exposure that gives a clean histogram can boil an atom out of a {depthMK.toFixed(1)} mK
          tweezer. Imaging therefore runs with simultaneous cooling — in the paper, a 1D cooling
          scheme in the {PAPER.cooling.bFieldG} G field (Methods) — or with short exposures and
          deep traps.
        </>
      }
    >
      <Panel tag="a" title={`exposure ${exposureMs} ms, s = ${sat}`} wide>
        <div className="slider-pair">
          <Slider label="Exposure" value={exposureMs} min={0.1} max={20} step={0.1} unit="ms" display={exposureMs.toFixed(1)} onChange={setExposureMs} />
          <Slider label="Saturation s" value={sat} min={0.02} max={2} step={0.02} display={sat.toFixed(2)} onChange={setSat} />
        </div>
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          scattering {b.scatterRateHz.toExponential(2)} /s → {b.photonsScattered.toFixed(0)} photons → {b.meanCounts.toFixed(1)} counts ·
          threshold ≥ {disc.threshold} → fidelity {(disc.fidelity * 100).toFixed(disc.fidelity > 0.999 ? 3 : 1)}% ·
          heating 2N E<sub>r</sub>/k<sub>B</sub> = {b.heatingMK.toFixed(2)} mK vs depth {depthMK.toFixed(2)} mK
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, mu0: number, mu1: number, thr: number, heatingMK: number, depthMK: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const px = 40;
  const py = 24;
  const pw = 400;
  const ph = 230;
  frame(ctx, px, py, pw, ph, 'probability of k counts');
  const kMax = Math.max(12, Math.ceil(mu1 + 4 * Math.sqrt(mu1 + 1)));
  const bw = pw / (kMax + 1);
  let pmax = 0;
  for (let k = 0; k <= kMax; k += 1) pmax = Math.max(pmax, poissonPmf(k, mu0), poissonPmf(k, mu1));
  for (let k = 0; k <= kMax; k += 1) {
    const p0 = poissonPmf(k, mu0);
    const p1 = poissonPmf(k, mu1);
    const x = px + k * bw;
    ctx.fillStyle = 'rgba(139,134,128,0.7)';
    ctx.fillRect(x + 1, py + ph - (p0 / pmax) * (ph - 30), bw * 0.45, (p0 / pmax) * (ph - 30));
    ctx.fillStyle = 'rgba(212,162,74,0.85)';
    ctx.fillRect(x + 1 + bw * 0.45, py + ph - (p1 / pmax) * (ph - 30), bw * 0.45, (p1 / pmax) * (ph - 30));
  }
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  const tick = Math.max(1, Math.round(kMax / 8));
  for (let k = 0; k <= kMax; k += tick) ctx.fillText(`${k}`, px + k * bw + 2, py + ph + 14);
  ctx.fillText('counts k', px + pw - 60, py + ph + 28);
  const xt = px + thr * bw;
  ctx.strokeStyle = RED;
  ctx.beginPath();
  ctx.moveTo(xt, py + 20);
  ctx.lineTo(xt, py + ph);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.fillText(`threshold ${thr}`, xt + 4, py + 32);
  ctx.fillStyle = '#8b8680';
  ctx.fillText(`grey  no atom: μ0 = ${mu0.toFixed(1)}`, px + pw - 190, py + 32);
  ctx.fillStyle = AMBER;
  ctx.fillText(`amber one atom: μ1 = ${mu1.toFixed(1)}`, px + pw - 190, py + 46);

  // heating gauge
  const gx = 470;
  const gy = 24;
  const gw = 170;
  const gh = 230;
  frame(ctx, gx, gy, gw, gh, 'heating vs trap depth');
  const lo = -2; // 0.01 mK
  const hi = 2; // 100 mK
  const yOf = (mK: number) => gy + gh - 10 - ((Math.log10(Math.max(mK, 10 ** lo)) - lo) / (hi - lo)) * (gh - 40);
  ctx.fillStyle = MUTED;
  for (const v of [0.01, 0.1, 1, 10, 100]) {
    ctx.fillText(`${v} mK`, gx + gw - 50, yOf(v) + 4);
    ctx.strokeStyle = '#1d1e20';
    ctx.beginPath();
    ctx.moveTo(gx, yOf(v));
    ctx.lineTo(gx + gw - 56, yOf(v));
    ctx.stroke();
  }
  const barX = gx + 10;
  const top = yOf(heatingMK);
  ctx.fillStyle = heatingMK > depthMK ? RED : heatingMK > depthMK / 3 ? AMBER : GREEN;
  ctx.fillRect(barX, top, 32, gy + gh - 10 - top);
  ctx.strokeStyle = BLUE;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(gx + 6, yOf(depthMK));
  ctx.lineTo(gx + gw - 56, yOf(depthMK));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = BLUE;
  ctx.fillText('depth', gx + 48, yOf(depthMK) - 4);
  ctx.fillStyle = CREAM;
  ctx.fillText(`${heatingMK.toFixed(2)} mK`, barX - 4, top - 6);
  ctx.fillStyle = MUTED;
  ctx.fillText(heatingMK > depthMK ? 'atom lost without cooling' : 'survives (barely) without cooling', gx + 6, gy + gh - 2 + 12);
}
