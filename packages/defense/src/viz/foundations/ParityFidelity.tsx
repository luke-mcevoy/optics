import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { depolarisedBellDiagnostics, parity, PHI_PLUS } from '../../physics/twoqubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, MONO, MUTED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 300;

export function ParityFidelity() {
  const [f, setF] = useState(0.9);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const d = depolarisedBellDiagnostics(f);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, f, d);
  }, [f, d]);
  return (
    <Figure
      n="F24"
      title="What “99.6% fidelity” measures: populations and parity"
      caption={
        <>
          You cannot read a two-qubit state in one shot; fidelity is inferred from two
          measurements on many copies. <strong>a</strong>, Populations in the computational basis:
          a Bell pair should give only 00 and 11. <strong>b</strong>, Apply a π/2 pulse of phase φ
          to both qubits and measure the parity Π = P<sub>00</sub> + P<sub>11</sub> − P<sub>01</sub> − P<sub>10</sub>;
          for |Φ+⟩ it oscillates as −cos 2φ with unit amplitude, and any loss of coherence between
          |00⟩ and |11⟩ lowers the amplitude C. Then F = ⟨Φ+|ρ|Φ+⟩ = (P<sub>00</sub> + P<sub>11</sub>)/2 + C/2.
          The slider mixes the ideal state with white noise, ρ = f|Φ+⟩⟨Φ+| + (1 − f)𝟙/4, for which
          the formula is exact. The paper&rsquo;s CZ fidelity of ~{PAPER.rydberg.czFidelityPct}% (Methods)
          is obtained by closely related methods on many gate repetitions; the logical-qubit
          numbers of chapters 11–13 are different objects — error rates of encoded operations —
          not to be confused with this.
        </>
      }
    >
      <Panel tag="a" title={`f = ${f.toFixed(2)} → F = ${(d.fidelity * 100).toFixed(1)}%`} wide>
        <Slider label="Bell-state weight f" value={f} min={0} max={1} step={0.01} display={f.toFixed(2)} onChange={setF} />
        <canvas ref={canvasRef} className="sketch" />
        <p className="board-cap">
          P<sub>00</sub> + P<sub>11</sub> = {d.populations.toFixed(3)} · parity contrast C = {d.contrast.toFixed(3)} · F = {d.populations.toFixed(3)}/2 + {d.contrast.toFixed(3)}/2 ={' '}
          {d.fidelity.toFixed(3)}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, f: number, d: { populations: number; contrast: number; fidelity: number }): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  // --- a: populations
  const ax = 40;
  const ay = 24;
  const aw = 220;
  const ah = 240;
  frame(ctx, ax, ay, aw, ah, 'a  populations');
  const p00 = f / 2 + (1 - f) / 4;
  const p01 = (1 - f) / 4;
  const pops = [p00, p01, p01, p00];
  const labels = ['00', '01', '10', '11'];
  pops.forEach((p, i) => {
    const x = ax + 20 + i * 50;
    const hgt = p * (ah - 70);
    ctx.fillStyle = '#1b1c1f';
    ctx.fillRect(x, ay + 30, 36, ah - 70);
    ctx.fillStyle = i === 0 || i === 3 ? BLUE : AMBER;
    ctx.fillRect(x, ay + 30 + (ah - 70) - hgt, 36, hgt);
    ctx.fillStyle = MUTED;
    ctx.font = MONO;
    ctx.fillText(labels[i]!, x + 10, ay + ah - 24);
    ctx.fillStyle = CREAM;
    ctx.fillText(p.toFixed(2), x + 4, ay + ah - 8);
  });
  ctx.fillStyle = MUTED;
  ctx.fillText(`P00 + P11 = ${d.populations.toFixed(3)}`, ax + 8, ay + ah + 16);

  // --- b: parity oscillation
  const px = 300;
  const py = 24;
  const pw = 340;
  const ph = 240;
  frame(ctx, px, py, pw, ph, 'b  parity Π(φ) after π/2 pulses of phase φ');
  const xOf = (phi: number) => px + (phi / Math.PI) * pw;
  const yOf = (v: number) => py + ph / 2 - v * (ph / 2 - 24);
  ctx.strokeStyle = '#1d1e20';
  ctx.beginPath();
  ctx.moveTo(px, yOf(0));
  ctx.lineTo(px + pw, yOf(0));
  ctx.stroke();
  // ideal (faint) and mixed (solid) — the mixed parity is f × ideal
  const curve = (scale: number, col: string, width: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 200; i += 1) {
      const phi = (i / 200) * Math.PI;
      const y = yOf(scale * parity(PHI_PLUS, phi));
      if (i === 0) ctx.moveTo(xOf(phi), y);
      else ctx.lineTo(xOf(phi), y);
    }
    ctx.stroke();
  };
  curve(1, 'rgba(176,138,214,0.3)', 1);
  curve(f, VIOLET, 2);
  ctx.lineWidth = 1;
  // contrast bracket
  ctx.strokeStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(xOf(Math.PI / 2) + 8, yOf(f));
  ctx.lineTo(xOf(Math.PI / 2) + 8, yOf(0));
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.font = MONO;
  ctx.fillText(`amplitude C = ${d.contrast.toFixed(2)}`, xOf(Math.PI / 2) + 14, yOf(f / 2) + 4);
  ctx.fillStyle = MUTED;
  ctx.fillText('0', px, py + ph + 14);
  ctx.fillText('π/2', xOf(Math.PI / 2) - 10, py + ph + 14);
  ctx.fillText('π', px + pw - 10, py + ph + 14);
  ctx.fillText('+1', px - 18, yOf(1) + 4);
  ctx.fillText('−1', px - 18, yOf(-1) + 4);
  ctx.fillStyle = CREAM;
  ctx.fillText(`F = (P00+P11)/2 + C/2 = ${d.fidelity.toFixed(3)}`, px + 8, py + ph - 8);
}
