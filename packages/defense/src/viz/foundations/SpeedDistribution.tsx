import { useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { deBroglieM, dopplerLimitK, maxwellBoltzmann, recoilTempK, vMostProbable, vRms } from '../../physics/cooling.ts';
import { tweezer } from '../../physics/light.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, lcg, MONO, MUTED, SANS, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;
const N_DOTS = 40;
const TRAP_MK = -tweezer(852e-9, 4e-3, 1e-6).depthMK; // reference: 4 mW, 1 μm, 852 nm

function fmtT(tK: number): string {
  if (tK >= 1) return `${tK.toFixed(0)} K`;
  if (tK >= 1e-3) return `${(tK * 1e3).toFixed(1)} mK`;
  if (tK >= 1e-6) return `${(tK * 1e6).toFixed(0)} μK`;
  return `${(tK * 1e9).toFixed(0)} nK`;
}
function fmtV(v: number): string {
  if (v >= 1) return `${v.toFixed(1)} m/s`;
  if (v >= 1e-2) return `${(v * 100).toFixed(1)} cm/s`;
  return `${(v * 1e3).toFixed(1)} mm/s`;
}

export function SpeedDistribution() {
  const [logT, setLogT] = useState(Math.log10(300)); // K
  const tK = 10 ** logT;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dots = useRef<{ x: number; v: number }[]>([]);
  const rand = useRef(lcg(5));
  const lastRef = useRef<number | null>(null);

  useRaf(
    (nowMs) => {
      const last = lastRef.current;
      lastRef.current = nowMs;
      const dt = last === null ? 0 : Math.min(0.05, (nowMs - last) / 1000);
      const canvas = canvasRef.current;
      if (canvas === null) return;
      // (re)sample dots from the MB distribution when the count is short
      const vp = vMostProbable(tK);
      if (dots.current.length < N_DOTS) {
        const r = rand.current;
        while (dots.current.length < N_DOTS) {
          // sample |v| from MB by rejection against the envelope at vp
          let v = 0;
          for (let tries = 0; tries < 50; tries += 1) {
            const cand = r() * 4 * vp;
            if (r() * maxwellBoltzmann(vp, tK) <= maxwellBoltzmann(cand, tK)) {
              v = cand;
              break;
            }
          }
          dots.current.push({ x: r(), v: ((r() < 0.5 ? -1 : 1) * v) / vp }); // stored in units of v_p
        }
      }
      // move: screen speed normalised to the most probable speed so the strip is always animated
      for (const d of dots.current) {
        d.x += d.v * 0.12 * dt;
        if (d.x < 0) d.x += 1;
        if (d.x > 1) d.x -= 1;
      }
      draw(canvas, tK, dots.current);
    },
    true,
    canvasRef,
  );

  const rms = vRms(tK);
  const ldb = deBroglieM(tK);

  return (
    <Figure
      n="F13"
      title="How fast is an atom, and how cold does it need to be?"
      caption={
        <>
          Maxwell–Boltzmann speed distribution of ⁸⁷Rb at the chosen temperature (log slider,
          300 K → 100 nK). The horizontal axis rescales with temperature: what stays fixed is the
          shape. Below, the same atoms as a strip of dots whose <em>relative</em> speeds are
          sampled from the curve. Markers: the depth of a typical tweezer ({TRAP_MK.toFixed(1)} mK
          for 4 mW at 1 μm waist, 852 nm) expressed as a temperature, the Doppler limit
          ({(dopplerLimitK() * 1e6).toFixed(0)} μK) and the recoil temperature
          ({(recoilTempK() * 1e9).toFixed(0)} nK). A room-temperature atom crosses a 1 μm tweezer
          in a few nanoseconds; to be caught it must be cooled by six orders of magnitude in
          temperature, which laser cooling does in milliseconds.
        </>
      }
    >
      <Panel tag="a" title={`T = ${fmtT(tK)}`} wide>
        <Slider label="Temperature (log scale)" value={logT} min={-7} max={Math.log10(300)} step={0.01} display={fmtT(tK)} onChange={setLogT} />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          v<sub>rms</sub> = √(3k<sub>B</sub>T/m) = {fmtV(rms)} · time to cross 1 μm: {fmtTime(1e-6 / rms)} · thermal de Broglie wavelength{' '}
          {ldb >= 1e-6 ? `${(ldb * 1e6).toFixed(2)} μm` : `${(ldb * 1e9).toFixed(2)} nm`} · k<sub>B</sub>T / tweezer depth ={' '}
          {(tK / (TRAP_MK * 1e-3)).toExponential(1)}
        </p>
      </Panel>
    </Figure>
  );
}

function fmtTime(s: number): string {
  if (s >= 1) return `${s.toFixed(1)} s`;
  if (s >= 1e-3) return `${(s * 1e3).toFixed(1)} ms`;
  if (s >= 1e-6) return `${(s * 1e6).toFixed(1)} μs`;
  return `${(s * 1e9).toFixed(1)} ns`;
}

function draw(canvas: HTMLCanvasElement, tK: number, dots: readonly { x: number; v: number }[]): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const px = 50;
  const py = 20;
  const pw = 590;
  const ph = 140;
  frame(ctx, px, py, pw, ph, 'f(v): fraction of atoms per unit speed');
  const vp = vMostProbable(tK);
  const vmax = 3.6 * vp;
  const fmax = maxwellBoltzmann(vp, tK);
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 300; i += 1) {
    const v = (i / 300) * vmax;
    const y = py + ph - (maxwellBoltzmann(v, tK) / fmax) * (ph - 26);
    if (i === 0) ctx.moveTo(px + (i / 300) * pw, y);
    else ctx.lineTo(px + (i / 300) * pw, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(110,168,212,0.12)';
  ctx.lineTo(px + pw, py + ph);
  ctx.lineTo(px, py + ph);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  for (const f of [0.5, 1, 2, 3]) {
    const x = px + ((f * vp) / vmax) * pw;
    ctx.fillText(fmtV(f * vp), x - 20, py + ph + 14);
    ctx.strokeStyle = '#1d1e20';
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x, py + ph);
    ctx.stroke();
  }
  const xr = px + (vRms(tK) / vmax) * pw;
  ctx.strokeStyle = AMBER;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(xr, py + 20);
  ctx.lineTo(xr, py + ph);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = AMBER;
  ctx.fillText(`v_rms = ${fmtV(vRms(tK))}`, xr + 6, py + 32);

  // temperature ladder
  const lx = 50;
  const ly = 248;
  const lw = 590;
  const tMin = -7;
  const tMax = Math.log10(300);
  const xOfT = (t: number) => lx + ((Math.log10(t) - tMin) / (tMax - tMin)) * lw;
  ctx.strokeStyle = '#3a3c40';
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx + lw, ly);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  for (const t of [1e-6, 1e-3, 1, 300]) {
    ctx.fillText(fmtT(t), xOfT(t) - 12, ly + 26);
    ctx.beginPath();
    ctx.moveTo(xOfT(t), ly - 4);
    ctx.lineTo(xOfT(t), ly + 4);
    ctx.stroke();
  }
  const mark = (t: number, label: string, col: string, up: number) => {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(xOfT(t), ly);
    ctx.lineTo(xOfT(t), ly - up);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fillText(label, xOfT(t) - 30, ly - up - 4);
  };
  mark(TRAP_MK * 1e-3, `tweezer depth ${TRAP_MK.toFixed(1)} mK`, VIOLET, 14);
  mark(dopplerLimitK(), 'Doppler limit 146 μK', GREEN, 38);
  mark(recoilTempK(), 'recoil 362 nK', '#8fb8e0', 14);
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(xOfT(tK), ly, 5, 0, 2 * Math.PI);
  ctx.fill();

  // dots strip
  const sy = 296;
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('sample of atoms (relative speeds):', lx, sy - 12);
  for (const d of dots) {
    ctx.fillStyle = Math.abs(d.v) > Math.sqrt(1.5) ? AMBER : BLUE; // faster than v_rms = √(3/2) v_p
    ctx.beginPath();
    ctx.arc(lx + d.x * lw, sy + 6 + ((d.v > 0 ? 1 : -1) * 3), 3, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = MUTED;
  ctx.font = SANS;
}
