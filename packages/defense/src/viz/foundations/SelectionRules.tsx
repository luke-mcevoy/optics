import { useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { lineStrength, pumpStep } from '../../physics/light.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { useRaf } from '../useRaf.ts';
import { AMBER, BLUE, CREAM, frame, MONO, MUTED, SANS, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 340;
type Pol = -1 | 0 | 1;
type Upper = 2 | 3;

const POL_LABEL: Record<Pol, string> = { [-1]: 'σ⁻ (Δm = −1)', 0: 'π (Δm = 0)', 1: 'σ⁺ (Δm = +1)' };

export function SelectionRules() {
  const [pol, setPol] = useState<Pol>(-1);
  const [upper, setUpper] = useState<Upper>(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const state = useRef({ pop: [0, 0, 1, 0, 0], scattered: 0, t: 0, last: null as number | null });
  const [, force] = useState(0);

  const reset = (p: Pol, u: Upper, start: 'center' | 'spread') => {
    setPol(p);
    setUpper(u);
    state.current = { pop: start === 'center' ? [0, 0, 1, 0, 0] : [0.2, 0.2, 0.2, 0.2, 0.2], scattered: 0, t: 0, last: null };
  };

  useRaf(
    (nowMs) => {
      const s = state.current;
      const last = s.last;
      s.last = nowMs;
      if (last !== null) {
        const dt = Math.min(0.05, (nowMs - last) / 1000);
        const r = pumpStep(s.pop, 2, upper, pol, dt * 1.6);
        s.pop = r.pop;
        s.scattered += r.scattered;
        s.t += dt;
        if (Math.floor(s.t * 8) !== Math.floor((s.t - dt) * 8)) force((v) => v + 1);
      }
      const canvas = canvasRef.current;
      if (canvas === null) return;
      draw(canvas, s.pop, pol, upper, s.scattered);
    },
    true,
    canvasRef,
  );

  const pop = state.current.pop;
  const stretched = pol === 1 ? pop[4]! : pol === -1 ? pop[0]! : 0;

  return (
    <Figure
      n="F11"
      title="Selection rules: light carries angular momentum, so it can steer m_F"
      caption={
        <>
          Ground F = 2 (bottom) and excited F′ (top) sublevels of the D2 line, with the allowed
          transitions for one polarisation. A photon carries one unit of angular momentum: σ<sup>±</sup>{' '}
          light changes m<sub>F</sub> by ±1, π light by 0; spontaneous decay can return by any of
          the three. Line thickness is the relative strength |⟨F m<sub>F</sub>; 1 q | F′ m<sub>F</sub>′⟩|²
          (Clebsch–Gordan coefficients). The bars are populations under a rate-equation model.
          With σ<sup>−</sup> light the population walks left until it reaches |2,−2⟩ — for F′ = 2 a
          <em> dark</em> state with no partner to absorb into (optical pumping); for F′ = 3 a
          <em> cycling</em> state that scatters forever (fluorescence imaging). The paper uses
          σ<sup>−</sup> pumping of |1⟩ into |2,−2⟩ as the first step of spin-to-position readout
          (guide, chapter 09) and the cycling transition to image.
        </>
      }
    >
      <Panel tag="a" title={`F = 2 → F′ = ${upper}, ${POL_LABEL[pol]}`} wide>
        <div className="mode-row">
          <button type="button" className={pol === -1 ? 'active' : undefined} onClick={() => reset(-1, upper, 'center')}>
            σ⁻ from |2,0⟩
          </button>
          <button type="button" className={pol === 1 ? 'active' : undefined} onClick={() => reset(1, upper, 'spread')}>
            σ⁺ from a spread
          </button>
          <button type="button" className={pol === 0 ? 'active' : undefined} onClick={() => reset(0, upper, 'spread')}>
            π from a spread
          </button>
          <button type="button" className={upper === 3 ? 'active' : undefined} onClick={() => reset(pol, 3, 'center')}>
            F′ = 3 (imaging)
          </button>
          <button type="button" className={upper === 2 ? 'active' : undefined} onClick={() => reset(pol, 2, 'center')}>
            F′ = 2 (pumping)
          </button>
        </div>
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          photons scattered: {state.current.scattered.toFixed(1)} · population in the stretched state: {(stretched * 100).toFixed(1)}% ·{' '}
          {pol !== 0 && upper === 2 ? 'dark once stretched — scattering stops' : pol !== 0 ? 'cycling once stretched — scattering continues' : 'π light has no stretched dark state here'}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, pop: readonly number[], pol: Pol, upper: Upper, scattered: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  const yG = 250;
  const yE = 80;
  const x0 = 60;
  const dx = 88;
  const xOfM = (m: number) => x0 + (m + 2) * dx + 90;

  // excited sublevels
  ctx.font = MONO;
  for (let mp = -upper; mp <= upper; mp += 1) {
    const x = xOfM(mp);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 28, yE);
    ctx.lineTo(x + 28, yE);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(`${mp > 0 ? '+' : ''}${mp}`, x, yE - 8);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = AMBER;
  ctx.font = SANS;
  ctx.fillText(`5P 3/2  F′ = ${upper}`, 16, yE - 30);
  ctx.fillStyle = BLUE;
  ctx.fillText('5S 1/2  F = 2', 16, yG + 4);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('m_F →', 16, yG + 30);

  // ground sublevels with population bars
  for (let m = -2; m <= 2; m += 1) {
    const x = xOfM(m);
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 28, yG);
    ctx.lineTo(x + 28, yG);
    ctx.stroke();
    const p = pop[m + 2] ?? 0;
    const hgt = p * 60;
    ctx.fillStyle = 'rgba(110,168,212,0.85)';
    ctx.fillRect(x - 16, yG - hgt - 2, 32, hgt);
    ctx.fillStyle = CREAM;
    ctx.font = MONO;
    ctx.textAlign = 'center';
    ctx.fillText(`${(p * 100).toFixed(0)}%`, x, yG + 16);
    ctx.fillStyle = MUTED;
    ctx.fillText(`${m > 0 ? '+' : ''}${m}`, x, yG + 30);
    ctx.textAlign = 'left';
  }

  // absorption arrows for chosen polarisation, thickness ∝ strength
  for (let m = -2; m <= 2; m += 1) {
    const mp = m + pol;
    if (Math.abs(mp) > upper) continue;
    const s = lineStrength(2, m, pol, upper);
    if (s <= 0) continue;
    const xa = xOfM(m);
    const xb = xOfM(mp);
    ctx.strokeStyle = pol === 0 ? VIOLET : pol > 0 ? '#e0a56a' : '#8fb8e0';
    ctx.lineWidth = 0.8 + 6 * s;
    ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, (pop[m + 2] ?? 0) * 3);
    ctx.beginPath();
    ctx.moveTo(xa, yG - 6);
    ctx.lineTo(xb, yE + 6);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.textAlign = 'center';
    ctx.fillText(s.toFixed(2), (xa + xb) / 2 + (pol === 0 ? 22 : 0), (yG + yE) / 2 + 4);
    ctx.textAlign = 'left';
  }
  // decay arrows (thin, grey) from each excited level to its three ground partners
  for (let mp = -upper; mp <= upper; mp += 1) {
    for (const q of [-1, 0, 1]) {
      const m = mp - q;
      if (Math.abs(m) > 2) continue;
      const s = lineStrength(2, m, q, upper);
      if (s <= 0) continue;
      ctx.strokeStyle = 'rgba(139,134,128,0.28)';
      ctx.lineWidth = 0.6 + 2 * s;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(xOfM(mp) + 4, yE + 6);
      ctx.lineTo(xOfM(m) + 4, yG - 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // legend
  frame(ctx, 16, 296, W - 32, 36);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText(`solid: absorption, width ∝ |CG|²  ·  dashed: spontaneous decay (any q)  ·  photons scattered: ${scattered.toFixed(1)}`, 26, 318);
}
