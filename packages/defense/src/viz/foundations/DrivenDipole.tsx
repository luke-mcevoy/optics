import { useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { twoLevelPolarizability } from '../../physics/light.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, MONO, MUTED, RED, SANS, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;
const D_MAX = 8;

export function DrivenDipole() {
  const [detuning, setDetuning] = useState(-3); // in linewidths
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useRaf(
    (nowMs) => {
      const last = lastRef.current;
      lastRef.current = nowMs;
      if (last !== null) tRef.current += Math.min(0.05, (nowMs - last) / 1000);
      const canvas = canvasRef.current;
      if (canvas === null) return;
      draw(canvas, detuning, tRef.current);
    },
    true,
    canvasRef,
  );

  const a = twoLevelPolarizability(detuning);
  const lag = Math.atan2(a.im, a.re); // phase of dipole relative to field

  return (
    <Figure
      n="F9"
      title="A driven electron: why red light pulls and blue light pushes"
      caption={
        <>
          <strong>a</strong>, The atom as a bound electron driven by the light&rsquo;s oscillating
          field E(t) (grey). The induced dipole d(t) (colour) follows with a phase lag that depends
          on where the drive frequency sits relative to the resonance: nearly in phase below
          resonance (red-detuned), a quarter cycle behind on resonance, opposite above (blue). The
          time-averaged energy is U = −½⟨d·E⟩ ∝ −Re α · I: negative — the atom is drawn toward
          bright light — when d and E are in phase. <strong>b</strong>, The two-level
          polarizability versus detuning in linewidths: Re α (dispersive, ∝ 1/Δ far out) sets the
          light shift and the force; Im α (a Lorentzian, ∝ 1/Δ²) sets absorption and hence photon
          scattering. Far from resonance the shift survives while the scattering dies — the whole
          reason optical tweezers are detuned by tens of nanometres.
        </>
      }
    >
      <Panel tag="a" title="Field and induced dipole" wide>
        <Slider
          label="Detuning Δ / Γ"
          value={detuning}
          min={-D_MAX}
          max={D_MAX}
          step={0.1}
          display={`${detuning >= 0 ? '+' : ''}${detuning.toFixed(1)}`}
          onChange={setDetuning}
        />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          phase lag {((lag * 180) / Math.PI).toFixed(0)}° · Re α = {a.re.toFixed(3)} · Im α = {a.im.toFixed(3)} (units of
          resonant |α|) · energy shift sign: {a.re > 0.001 ? 'negative — attracted to intensity' : a.re < -0.001 ? 'positive — repelled' : 'zero (pure absorption)'}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, detuning: number, t: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const a = twoLevelPolarizability(detuning);
  // display amplitude: compress the 1/Δ fall-off so the motion stays visible off resonance
  const amp = Math.min(1, Math.hypot(a.re, a.im) ** 0.5);
  const lag = Math.atan2(a.im, a.re);
  const color = detuning < -0.3 ? RED : detuning > 0.3 ? BLUE : VIOLET;

  // --- a: field and dipole phasors + traces
  const cx = 110;
  const cy = 120;
  const R = 70;
  const w = 2.2; // display angular frequency
  const phase = w * t;
  ctx.strokeStyle = '#26282c';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.stroke();
  // nucleus and electron
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
  ctx.fill();
  const ex = cx + R * amp * Math.cos(phase - lag) * 0.9;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(ex, cy, 6, 0, 2 * Math.PI);
  ctx.fill();
  // field arrow (horizontal), dipole arrow
  const E = Math.cos(phase);
  ctx.strokeStyle = MUTED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 92);
  ctx.lineTo(cx + 60 * E, cy + 92);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('E(t)', cx - 90, cy + 96);
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 112);
  ctx.lineTo(cx + 60 * amp * Math.cos(phase - lag), cy + 112);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText('d(t)', cx - 90, cy + 116);
  ctx.fillStyle = CREAM;
  ctx.font = SANS;
  ctx.fillText('electron on a spring', 30, 24);

  // traces
  const tx = 230;
  const ty = 30;
  const tw = 170;
  const th = 100;
  frame(ctx, tx, ty, tw, th, 'E(t) and d(t)');
  const trace = (fn: (tt: number) => number, col: string, width: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 160; i += 1) {
      const tt = t - 3 + (i / 160) * 3;
      const y = ty + th / 2 - fn(tt) * (th / 2 - 12);
      if (i === 0) ctx.moveTo(tx + (i / 160) * tw, y);
      else ctx.lineTo(tx + (i / 160) * tw, y);
    }
    ctx.stroke();
  };
  trace((tt) => Math.cos(w * tt), '#5a5c60', 1.2);
  trace((tt) => amp * Math.cos(w * tt - lag), color, 1.8);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(`lag ${((lag * 180) / Math.PI).toFixed(0)}°`, tx + tw - 60, ty + th - 6);
  ctx.fillText('(d amplitude compressed for display)', tx, ty + th + 56);
  // energy
  const U = -0.5 * a.re; // ∝ −Re α
  ctx.fillStyle = CREAM;
  ctx.font = SANS;
  ctx.fillText(`U = −½⟨d·E⟩ ∝ −Re α = ${(-a.re).toFixed(2)}`, tx, ty + th + 22);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(U < -0.001 ? 'pulled into the beam' : U > 0.001 ? 'pushed out of the beam' : 'no shift', tx, ty + th + 40);

  // --- b: Re and Im vs detuning
  const px = 430;
  const py = 30;
  const pw = 210;
  const ph = 250;
  frame(ctx, px, py, pw, ph, 'α(Δ)');
  const xOf = (d: number) => px + ((d + D_MAX) / (2 * D_MAX)) * pw;
  const yOf = (v: number) => py + ph / 2 - v * (ph / 2 - 14);
  ctx.strokeStyle = '#1d1e20';
  ctx.beginPath();
  ctx.moveTo(px, yOf(0));
  ctx.lineTo(px + pw, yOf(0));
  ctx.moveTo(xOf(0), py);
  ctx.lineTo(xOf(0), py + ph);
  ctx.stroke();
  const curve = (f: (d: number) => number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 300; i += 1) {
      const d = -D_MAX + (i / 300) * 2 * D_MAX;
      const y = yOf(f(d));
      if (i === 0) ctx.moveTo(xOf(d), y);
      else ctx.lineTo(xOf(d), y);
    }
    ctx.stroke();
  };
  curve((d) => twoLevelPolarizability(d).re, AMBER);
  curve((d) => twoLevelPolarizability(d).im, BLUE);
  ctx.fillStyle = AMBER;
  ctx.font = MONO;
  ctx.fillText('Re α  (shift, force)', px + 6, py + ph - 22);
  ctx.fillStyle = BLUE;
  ctx.fillText('Im α  (scattering)', px + 6, py + ph - 8);
  ctx.fillStyle = MUTED;
  ctx.fillText('red ←  Δ/Γ  → blue', px + pw / 2 - 60, py + ph + 16);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xOf(detuning), py);
  ctx.lineTo(xOf(detuning), py + ph);
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(xOf(detuning), yOf(a.re), 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(xOf(detuning), yOf(a.im), 4, 0, 2 * Math.PI);
  ctx.fill();
}
