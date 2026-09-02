import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { ramanPhotonsPerPi } from '../../physics/light.ts';
import { scatteringRate, twoPhotonRabi } from '../../physics/formulas.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, MONO, MUTED, RED, SANS, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;
const GAMMA_MHZ = 6.0666; // Γ/2π of the D2 line
const D_MIN_GHZ = 5;
const D_MAX_GHZ = 2000;

export function RamanLambda() {
  const [deltaGHz, setDeltaGHz] = useState<number>(PAPER.raman.intermediateDetuningGHz);
  const [omegaMHz, setOmegaMHz] = useState(740); // single-photon Rabi frequency /2π
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const om = 2 * Math.PI * omegaMHz * 1e6;
  const de = 2 * Math.PI * deltaGHz * 1e9;
  const g = 2 * Math.PI * GAMMA_MHZ * 1e6;
  const effHz = twoPhotonRabi(om, om, de) / (2 * Math.PI);
  const scHz = 2 * scatteringRate(om, g, de); // two beams
  const perPi = 2 * ramanPhotonsPerPi(g, de);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, deltaGHz, omegaMHz);
  }, [deltaGHz, omegaMHz]);

  return (
    <Figure
      n="F12"
      title="Two photons through a virtual level: the Raman transition"
      caption={
        <>
          <strong>a</strong>, Λ scheme. Two laser beams, each far detuned by Δ from the 5P excited
          state but whose frequency <em>difference</em> equals the {PAPER.qubit.hyperfineGHz} GHz
          qubit splitting, drive |0⟩ ↔ |1⟩ without ever populating 5P. Adiabatically eliminating
          the excited state gives an effective two-level drive with Ω<sub>eff</sub> = Ω₁Ω₂/2Δ,
          while each beam still scatters photons at Γ<sub>sc</sub> = ΓΩ²/4Δ². <strong>b</strong>,
          Both versus Δ (log–log): Ω<sub>eff</sub> falls as 1/Δ, scattering as 1/Δ². The photons
          scattered during one π pulse, Γ<sub>sc</sub> × π/Ω<sub>eff</sub> = πΓ/2Δ per beam, do not
          depend on power at all — only on how far you detune. That is why the paper detunes by{' '}
          {PAPER.raman.intermediateDetuningGHz} GHz (≈ 10⁵ linewidths) and then buys back the
          speed with more power; it quotes ~{PAPER.raman.scatteringPerPulse.toExponential(0)} scattering
          events per (composite) pulse. The single-photon Ω slider is a stand-in for laser power
          (Ω ∝ √I) and is not a paper value.
        </>
      }
    >
      <Panel tag="a" title="Λ scheme and scaling with detuning" wide>
        <div className="slider-pair">
          <Slider
            label="Detuning Δ from 5P"
            value={deltaGHz}
            min={D_MIN_GHZ}
            max={D_MAX_GHZ}
            step={5}
            unit="GHz"
            onChange={setDeltaGHz}
          />
          <Slider label="Single-photon Ω/2π (∝ √power)" value={omegaMHz} min={50} max={2000} step={10} unit="MHz" onChange={setOmegaMHz} />
        </div>
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          Ω<sub>eff</sub>/2π = {(effHz / 1e6).toFixed(3)} MHz · π pulse {(1e6 / (2 * effHz)).toFixed(2)} μs · Γ<sub>sc</sub> (both beams) ={' '}
          {scHz.toFixed(0)} /s · photons per π pulse = {perPi.toExponential(2)} · Δ/Γ = {(deltaGHz * 1e3 / GAMMA_MHZ).toExponential(1)}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, deltaGHz: number, omegaMHz: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');

  // --- a: Λ diagram
  const xL = 60;
  const xR = 200;
  const yE = 40; // 5P
  const yV = yE + 40 + (Math.log10(deltaGHz / D_MIN_GHZ) / Math.log10(D_MAX_GHZ / D_MIN_GHZ)) * 120; // virtual level, lower with more detuning
  const y1 = 250;
  const y0 = 285;
  ctx.lineWidth = 2;
  ctx.strokeStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(xL, yE);
  ctx.lineTo(xR + 40, yE);
  ctx.stroke();
  ctx.strokeStyle = BLUE;
  ctx.beginPath();
  ctx.moveTo(xL, y0);
  ctx.lineTo(xL + 70, y0);
  ctx.moveTo(xR - 30, y1);
  ctx.lineTo(xR + 40, y1);
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#5c5c60';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xL, yV);
  ctx.lineTo(xR + 40, yV);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = MONO;
  ctx.fillStyle = AMBER;
  ctx.fillText('5P', xR + 46, yE + 4);
  ctx.fillStyle = '#8b8680';
  ctx.fillText('virtual level', xR + 46, yV + 4);
  ctx.fillStyle = BLUE;
  ctx.fillText('|0⟩ F=1', xL, y0 + 16);
  ctx.fillText('|1⟩ F=2', xR - 30, y1 + 16);
  // Δ bracket
  ctx.strokeStyle = MUTED;
  ctx.beginPath();
  ctx.moveTo(xR + 30, yE);
  ctx.lineTo(xR + 30, yV);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.fillText(`Δ = ${deltaGHz} GHz`, xR + 36, (yE + yV) / 2 + 4);
  // beams
  const arrow = (x1: number, ya: number, x2: number, yb: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x1, ya);
    ctx.lineTo(x2, yb);
    ctx.stroke();
    const ang = Math.atan2(yb - ya, x2 - x1);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x2, yb);
    ctx.lineTo(x2 - 8 * Math.cos(ang - 0.4), yb - 8 * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - 8 * Math.cos(ang + 0.4), yb - 8 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  };
  arrow(xL + 35, y0, xL + 95, yV, VIOLET);
  arrow(xL + 105, yV, xR + 5, y1, VIOLET);
  ctx.fillStyle = VIOLET;
  ctx.fillText('ω₁', xL + 40, (y0 + yV) / 2);
  ctx.fillText('ω₂', xR + 10, (y1 + yV) / 2 + 20);
  ctx.fillStyle = CREAM;
  ctx.font = SANS;
  ctx.fillText(`ω₁ − ω₂ = ${PAPER.qubit.hyperfineGHz} GHz`, xL, 24);

  // --- b: log-log plot
  const px = 330;
  const py = 30;
  const pw = 300;
  const ph = 240;
  frame(ctx, px, py, pw, ph, 'vs detuning Δ (log–log)');
  const gamma = 2 * Math.PI * GAMMA_MHZ * 1e6;
  const om = 2 * Math.PI * omegaMHz * 1e6;
  const xOf = (dGHz: number) => px + (Math.log10(dGHz / D_MIN_GHZ) / Math.log10(D_MAX_GHZ / D_MIN_GHZ)) * pw;
  const lo = -1; // 10^-1 Hz
  const hi = 8; // 10^8 Hz
  const yOf = (hz: number) => py + ph - ((Math.log10(Math.max(hz, 10 ** lo)) - lo) / (hi - lo)) * ph;
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  for (let d = lo; d <= hi; d += 1) {
    ctx.strokeStyle = '#1a1b1e';
    ctx.beginPath();
    ctx.moveTo(px, yOf(10 ** d));
    ctx.lineTo(px + pw, yOf(10 ** d));
    ctx.stroke();
    if (d % 2 === 0) ctx.fillText(d === 0 ? '1 Hz' : `1e${d}`, px - 34, yOf(10 ** d) + 4);
  }
  for (const d of [10, 100, 1000]) ctx.fillText(`${d} GHz`, xOf(d) - 18, py + ph + 16);
  const curve = (f: (dGHz: number) => number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 200; i += 1) {
      const dGHz = D_MIN_GHZ * (D_MAX_GHZ / D_MIN_GHZ) ** (i / 200);
      const y = yOf(f(dGHz));
      if (i === 0) ctx.moveTo(xOf(dGHz), y);
      else ctx.lineTo(xOf(dGHz), y);
    }
    ctx.stroke();
  };
  const effOf = (dGHz: number) => twoPhotonRabi(om, om, 2 * Math.PI * dGHz * 1e9) / (2 * Math.PI);
  const scOf = (dGHz: number) => 2 * scatteringRate(om, gamma, 2 * Math.PI * dGHz * 1e9);
  curve(effOf, VIOLET);
  curve(scOf, AMBER);
  ctx.fillStyle = VIOLET;
  ctx.fillText('Ω_eff/2π  ∝ 1/Δ', px + 8, py + ph - 52);
  ctx.fillStyle = AMBER;
  ctx.fillText('Γ_sc  ∝ 1/Δ²', px + 8, py + ph - 38);
  // marker
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xOf(deltaGHz), py);
  ctx.lineTo(xOf(deltaGHz), py + ph);
  ctx.stroke();
  ctx.fillStyle = CREAM;
  for (const v of [effOf(deltaGHz), scOf(deltaGHz)]) {
    ctx.beginPath();
    ctx.arc(xOf(deltaGHz), yOf(v), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  const pp = 2 * ramanPhotonsPerPi(gamma, 2 * Math.PI * deltaGHz * 1e9);
  ctx.fillStyle = MUTED;
  ctx.fillText(`photons per π pulse = πΓ/Δ = ${pp.toExponential(2)}`, px + 8, py + ph - 8);
  ctx.strokeStyle = '#3a3c40';
  ctx.beginPath();
  ctx.moveTo(xOf(PAPER.raman.intermediateDetuningGHz), py);
  ctx.lineTo(xOf(PAPER.raman.intermediateDetuningGHz), py + ph);
  ctx.stroke();
  ctx.fillText(`paper: ${PAPER.raman.intermediateDetuningGHz} GHz`, xOf(PAPER.raman.intermediateDetuningGHz) - 60, py + ph - 24);
}
