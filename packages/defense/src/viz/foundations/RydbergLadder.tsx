import { useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { effectiveN, meanRadiusNm } from '../../physics/orbitals.ts';
import { bindingCm, bindingEV, bindingTHz, dipoleDebye, orbitPeriodS, spacingGHz } from '../../physics/rydberg.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, MONO, MUTED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 360;

export function RydbergLadder() {
  const [n, setN] = useState<number>(PAPER.rydberg.n);
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
      draw(canvas, n, tRef.current);
    },
    true,
    canvasRef,
  );

  const ns = effectiveN(n, 0);
  return (
    <Figure
      n="F17"
      title="The Rydberg ladder: one electron, very far from home"
      caption={
        <>
          <strong>a</strong>, Energies of the rubidium nS series below the ionisation limit,
          E<sub>n</sub> = −R<sub>Rb</sub>/(n − δ<sub>s</sub>)² with quantum defect δ<sub>s</sub> ≈ 3.13:
          the levels crowd together as 1/n*², their spacing shrinking as n*⁻³. The ground state
          5S sits 4.18 eV down (off the bottom of this plot). <strong>b</strong>, The classical
          orbit of the chosen state drawn to scale against the 5S ground-state orbital (small
          disc, ⟨r⟩ ≈ {meanRadiusNm(5, 0).toFixed(2)} nm in the quantum-defect model). Radius grows as n*², so the n = {PAPER.rydberg.n} electron
          orbits ~{(meanRadiusNm(PAPER.rydberg.n, 0) / meanRadiusNm(5, 0)).toFixed(0)}× further out than in the ground
          state, at a Kepler period ∝ n*³ (the dot circulates at a slowed rate). Everything
          unusual about Rydberg atoms — enormous dipole moments, exquisite sensitivity to fields,
          strong mutual interactions — follows from this size.
        </>
      }
    >
      <Panel tag="a" title={`n = ${n}, n* = ${ns.toFixed(2)}`} wide>
        <Slider label="Principal quantum number n" value={n} min={10} max={100} step={1} onChange={setN} />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          binding {bindingTHz(n).toFixed(3)} THz = {bindingCm(n).toFixed(1)} cm⁻¹ = {(bindingEV(n) * 1e3).toFixed(2)} meV · to n+1: {spacingGHz(n).toFixed(1)} GHz ·
          ⟨r⟩ = {(meanRadiusNm(n, 0) / 1e3).toFixed(3)} μm · period {(orbitPeriodS(n) * 1e12).toFixed(1)} ps · dipole ~n*² e a₀ ≈ {dipoleDebye(n).toFixed(0)} D
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, n: number, t: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  // --- a: ladder (energy axis: -1/n*^2, plotted from n = 10 to ionisation)
  const px = 40;
  const py = 20;
  const pw = 260;
  const ph = 300;
  frame(ctx, px, py, pw, ph, 'a  nS energies below ionisation');
  // logarithmic binding-energy axis: n = 10 (70 THz) at the bottom, n = 120 near the top
  const eLo = Math.log10(bindingTHz(120));
  const eHi = Math.log10(bindingTHz(10));
  const yOf = (eTHz: number) => py + 34 + ((Math.log10(eTHz) - eLo) / (eHi - eLo)) * (ph - 60);
  ctx.strokeStyle = MUTED;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(px + 10, py + 22);
  ctx.lineTo(px + pw - 10, py + 22);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('ionisation limit (E = 0, log axis ↑)', px + 14, py + 18);
  for (let k = 10; k <= 120; k += 1) {
    const y = yOf(bindingTHz(k));
    const isSel = k === n;
    ctx.strokeStyle = isSel ? AMBER : k % 10 === 0 ? '#5a5c60' : '#2e3034';
    ctx.lineWidth = isSel ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(px + 30, y);
    ctx.lineTo(px + pw - 30, y);
    ctx.stroke();
    if (k % 10 === 0 && k <= 100) {
      ctx.fillStyle = MUTED;
      ctx.fillText(`${k}S`, px + pw - 26, y + 4);
    }
  }
  const ySel = yOf(bindingTHz(n));
  ctx.fillStyle = AMBER;
  ctx.fillText(`${n}S  −${bindingTHz(n).toFixed(2)} THz`, px + 34, ySel - 5);
  ctx.fillStyle = MUTED;
  ctx.fillText('binding energy, log scale', px + 34, py + ph - 22);
  ctx.fillStyle = MUTED;
  ctx.fillText('5S is 1010 THz further down ↓', px + 14, py + ph - 8);

  // --- b: orbit to scale
  const cx = 480;
  const cy = 176;
  const rMax = 126;
  const ns = effectiveN(n, 0);
  const nsMax = effectiveN(100, 0);
  const rSel = rMax * (ns * ns) / (nsMax * nsMax);
  const rGround = Math.max(1.2, rMax * (effectiveN(5, 0) ** 2) / (nsMax * nsMax));
  ctx.fillStyle = CREAM;
  ctx.font = MONO;
  ctx.fillText('b  orbit radius to scale (n = 100 fills the box)', 330, 30);
  ctx.strokeStyle = '#2a2b2e';
  ctx.strokeRect(cx - rMax - 10, cy - rMax - 10, 2 * rMax + 20, 2 * rMax + 20);
  // nucleus + ground orbital
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.arc(cx, cy, rGround, 0, 2 * Math.PI);
  ctx.fill();
  // selected orbit
  ctx.strokeStyle = 'rgba(212,162,74,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(rSel, rGround + 2), 0, 2 * Math.PI);
  ctx.stroke();
  // electron dot, angular speed ∝ 1/n*^3 (relative to n = 53)
  const ref = effectiveN(53, 0);
  const omega = 1.4 * (ref / ns) ** 3;
  const ang = omega * t;
  ctx.fillStyle = VIOLET;
  ctx.beginPath();
  ctx.arc(cx + Math.max(rSel, rGround + 2) * Math.cos(ang), cy + Math.max(rSel, rGround + 2) * Math.sin(ang), 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.fillText(`⟨r⟩ = ${(meanRadiusNm(n, 0) / 1e3).toFixed(3)} μm`, cx - 44, cy + rMax + 34);
  ctx.fillText(`ground state 5S: ${meanRadiusNm(5, 0).toFixed(2)} nm`, cx - 90, cy + rMax + 48);
  // scale bar: 0.1 μm
  const bar = rMax * (100 / (meanRadiusNm(100, 0)));
  ctx.strokeStyle = CREAM;
  ctx.beginPath();
  ctx.moveTo(cx + rMax - bar, cy - rMax - 2);
  ctx.lineTo(cx + rMax, cy - rMax - 2);
  ctx.stroke();
  ctx.fillText('0.1 μm', cx + rMax - bar, cy - rMax - 6);
}
