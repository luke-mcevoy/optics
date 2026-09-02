import { useEffect, useMemo, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { integrateBlockade, N_PTS, TAU_MAX } from '../../physics/blockade.ts';
import { vdwShiftMHz } from '../../physics/rydberg.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 320;
const V_CAP = 60; // largest V/Ω integrated (stiff beyond)

export function BlockadeLevels() {
  const [rUm, setRUm] = useState(6);
  const omega = PAPER.rydberg.rabiMHz;
  const vOverOmega = Math.min(V_CAP, vdwShiftMHz(PAPER.rydberg.n, rUm) / omega);
  const curves = useMemo(() => integrateBlockade(vOverOmega), [vOverOmega]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, vOverOmega, curves, rUm);
  }, [vOverOmega, curves, rUm]);

  const trueV = vdwShiftMHz(PAPER.rydberg.n, rUm) / omega;
  return (
    <Figure
      n="F20"
      title="Blockade in the pair-state picture"
      caption={
        <>
          <strong>a</strong>, The three symmetric states of two atoms driven by the same
          Rydberg laser: |gg⟩, the singly excited |W⟩ = (|gr⟩ + |rg⟩)/√2, and |rr⟩, which is
          shifted by V = C₆/R⁶. Two rungs of the ladder are resonant with the laser; the top one
          is not when V ≫ ħΩ. <strong>b</strong>, The populations from integrating the
          Schrödinger equation for the chosen R (Ω/2π = {omega} MHz, n = {PAPER.rydberg.n}). Far
          apart, both atoms Rabi-flop independently and |rr⟩ fills. Close together, |rr⟩ stays
          empty and the pair oscillates between |gg⟩ and |W⟩ at the <em>collectively enhanced</em>{' '}
          frequency √2 Ω — the fingerprint of blockade, and the mechanism that lets a laser pulse
          impart a conditional phase to two atoms (see{' '}
          <a href="#/foundations/entanglement">Entanglement and two-qubit gates</a>). Slide R
          through the blockade radius and watch the character of the dynamics change; V/Ω is
          capped at {V_CAP} for the integrator.
        </>
      }
    >
      <Panel tag="a" title={`R = ${rUm.toFixed(1)} μm · V/ħΩ = ${trueV.toExponential(1)}`} wide>
        <Slider label="Separation R" value={rUm} min={2} max={12} step={0.1} unit="μm" display={rUm.toFixed(1)} onChange={setRUm} />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          V/h = {vdwShiftMHz(PAPER.rydberg.n, rUm) >= 1000 ? `${(vdwShiftMHz(PAPER.rydberg.n, rUm) / 1e3).toFixed(2)} GHz` : `${vdwShiftMHz(PAPER.rydberg.n, rUm).toFixed(2)} MHz`} ·
          max P(rr) = {Math.max(...curves.rr).toFixed(3)} · first return to |gg⟩ at Ωt ≈ {firstReturn(curves.gg).toFixed(2)} (2π alone, 2π/√2 = 4.44 blockaded)
        </p>
      </Panel>
    </Figure>
  );
}

function firstReturn(gg: Float64Array): number {
  // first local maximum of P(gg) after leaving 1
  for (let i = 2; i < gg.length - 1; i += 1) {
    if (gg[i]! > gg[i - 1]! && gg[i]! >= gg[i + 1]! && gg[i]! > 0.5) return (i / (N_PTS - 1)) * TAU_MAX;
  }
  return NaN;
}

function draw(canvas: HTMLCanvasElement, v: number, curves: { gg: Float64Array; w: Float64Array; rr: Float64Array }, rUm: number): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  // --- a: pair-state ladder
  const lx = 40;
  const ly = 20;
  const lw = 220;
  const lh = 280;
  frame(ctx, lx, ly, lw, lh, 'a  pair states');
  const yGG = ly + lh - 40;
  const yW = ly + lh / 2 + 10;
  const yRR0 = ly + 60; // unshifted |rr⟩
  const shiftPx = Math.min(44, 44 * Math.log10(1 + v) / Math.log10(1 + V_CAP));
  const yRR = yRR0 - shiftPx;
  const level = (y: number, label: string, col: string, dash = false) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    if (dash) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(lx + 40, y);
    ctx.lineTo(lx + lw - 60, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.font = MONO;
    ctx.fillText(label, lx + lw - 54, y + 4);
  };
  level(yGG, '|gg⟩', BLUE);
  level(yW, '|W⟩', VIOLET);
  level(yRR0, shiftPx > 12 ? '|rr⟩ (V=0)' : '', '#3a3c40', true);
  level(yRR, '|rr⟩', AMBER);
  // laser arrows (equal length = resonant rungs)
  const arrow = (y1: number, y2: number, col: string, x: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y1 - 4);
    ctx.lineTo(x, y2 + 6);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y2);
    ctx.lineTo(x - 5, y2 + 9);
    ctx.lineTo(x + 5, y2 + 9);
    ctx.closePath();
    ctx.fill();
  };
  arrow(yGG, yW, RED, lx + 70);
  arrow(yW, yRR0, RED, lx + 100);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  ctx.fillText('√2 Ω', lx + 76, (yGG + yW) / 2 + 4);
  ctx.fillText('√2 Ω', lx + 106, (yW + yRR0) / 2 + 4);
  ctx.strokeStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(lx + 150, yRR0);
  ctx.lineTo(lx + 150, yRR);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.fillText(`V = C₆/R⁶`, lx + 120, yRR - 8);
  ctx.fillStyle = MUTED;
  ctx.fillText(v > 3 ? 'top rung detuned: blocked' : v < 0.3 ? 'all rungs resonant' : 'partially blocked', lx + 10, ly + lh - 8);

  // --- b: populations
  const px = 300;
  const py = 20;
  const pw = 340;
  const ph = 250;
  frame(ctx, px, py, pw, ph, `b  populations vs pulse area Ωt  (R = ${rUm.toFixed(1)} μm)`);
  const plot = (arr: Float64Array, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 1) {
      const x = px + (i / (arr.length - 1)) * pw;
      const y = py + ph - arr[i]! * (ph - 30);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  plot(curves.gg, BLUE);
  plot(curves.w, VIOLET);
  plot(curves.rr, AMBER);
  ctx.fillStyle = MUTED;
  ctx.font = MONO;
  for (let k = 0; k <= 8; k += 2) {
    const x = px + ((k * Math.PI) / TAU_MAX) * pw;
    ctx.fillText(`${k}π`, x - 6, py + ph + 14);
  }
  ctx.fillStyle = BLUE;
  ctx.fillText('P(gg)', px + 8, py + 30);
  ctx.fillStyle = VIOLET;
  ctx.fillText('P(W)', px + 60, py + 30);
  ctx.fillStyle = AMBER;
  ctx.fillText('P(rr)', px + 108, py + 30);
  ctx.fillStyle = CREAM;
  ctx.fillText(`V/Ω = ${v.toFixed(v < 10 ? 2 : 0)}${v >= V_CAP ? ' (capped)' : ''}`, px + pw - 120, py + 30);
}
