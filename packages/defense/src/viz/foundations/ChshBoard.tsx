import { useEffect, useRef, useState } from 'react';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { chsh, classicalChshBound, correlation, PHI_PLUS } from '../../physics/twoqubit.ts';
import { clear, sizeCanvas } from '../canvas.ts';
import { AMBER, BLUE, CREAM, frame, GREEN, lcg, MONO, MUTED, RED, VIOLET } from './bloch2d.ts';

const W = 660;
const H = 300;
const TSIRELSON = 2 * Math.SQRT2;

export function ChshBoard() {
  const [aDeg, setADeg] = useState(0);
  const [apDeg, setApDeg] = useState(90);
  const [bDeg, setBDeg] = useState(45);
  const [bpDeg, setBpDeg] = useState(135);
  const [visibility, setVisibility] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rand = useRef(lcg(23));
  const [sample, setSample] = useState<{ n: number; s: number } | null>(null);

  const rad = (d: number) => (d * Math.PI) / 180;
  const E = (a: number, b: number) => visibility * correlation(PHI_PLUS, a, b);
  const S = chsh(E, rad(aDeg), rad(apDeg), rad(bDeg), rad(bpDeg));

  const runSample = (n: number) => {
    // Monte Carlo: each of the four settings gets n/4 pairs; sample ±1 outcomes with the model correlation
    const pairs: [number, number, number][] = [
      [rad(aDeg), rad(bDeg), 1],
      [rad(aDeg), rad(bpDeg), -1],
      [rad(apDeg), rad(bDeg), 1],
      [rad(apDeg), rad(bpDeg), 1],
    ];
    let s = 0;
    for (const [a, b, sign] of pairs) {
      const e = E(a, b);
      const pSame = (1 + e) / 2;
      let same = 0;
      const m = Math.floor(n / 4);
      for (let i = 0; i < m; i += 1) if (rand.current() < pSame) same += 1;
      s += sign * ((2 * same) / m - 1);
    }
    setSample({ n, s });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    draw(canvas, rad(aDeg), rad(apDeg), rad(bDeg), rad(bpDeg), visibility, S, sample);
  }, [aDeg, apDeg, bDeg, bpDeg, visibility, S, sample]);

  return (
    <Figure
      n="F23"
      title="The CHSH test: a number no classical world can exceed"
      caption={
        <>
          Station A chooses between angles a and a′, station B between b and b′; from the four
          correlations form S = E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′). If each qubit carried
          pre-assigned answers to both of its questions (any local hidden-variable model), every
          term is a product of fixed ±1&rsquo;s and |S| ≤ 2 — exhaustively checked over all{' '}
          {2 ** 4} deterministic assignments; mixtures cannot do better. Quantum mechanics with a
          Bell pair gives S = 2√2 ≈ {TSIRELSON.toFixed(3)} at a = 0°, a′ = 90°, b = 45°, b′ = 135°
          (Tsirelson&rsquo;s bound). The visibility slider scales all correlations, as imperfect
          state preparation does: the violation survives down to V = 1/√2. The paper reports an
          error-corrected CHSH value of {PAPER.codes.chsh} on <em>logical</em> qubits (Methods) — the
          same test, run on encoded rather than physical qubits, and still above 2. Sample finite
          runs to see the statistical scatter.
        </>
      }
    >
      <Panel tag="a" title={`S = ${S.toFixed(3)} · ${Math.abs(S) > 2 ? 'violates the classical bound' : 'classically allowed'}`} wide>
        <div className="slider-pair">
          <Slider label="a" value={aDeg} min={-180} max={180} step={1} unit="°" onChange={setADeg} />
          <Slider label="a′" value={apDeg} min={-180} max={180} step={1} unit="°" onChange={setApDeg} />
          <Slider label="b" value={bDeg} min={-180} max={180} step={1} unit="°" onChange={setBDeg} />
          <Slider label="b′" value={bpDeg} min={-180} max={180} step={1} unit="°" onChange={setBpDeg} />
        </div>
        <Slider label="Visibility V (state quality)" value={visibility} min={0} max={1} step={0.01} display={visibility.toFixed(2)} onChange={setVisibility} />
        <canvas ref={canvasRef} className="sketch" />
        <div className="mode-row">
          <button type="button" onClick={() => runSample(100)}>
            sample 100 pairs
          </button>
          <button type="button" onClick={() => runSample(1000)}>
            sample 1 000
          </button>
          <button type="button" onClick={() => runSample(20000)}>
            sample 20 000
          </button>
          <button
            type="button"
            onClick={() => {
              setADeg(0);
              setApDeg(90);
              setBDeg(45);
              setBpDeg(135);
            }}
          >
            optimal angles
          </button>
        </div>
        <p className="board-cap">
          E(a,b) = {E(rad(aDeg), rad(bDeg)).toFixed(3)} · E(a,b′) = {E(rad(aDeg), rad(bpDeg)).toFixed(3)} · E(a′,b) = {E(rad(apDeg), rad(bDeg)).toFixed(3)} · E(a′,b′) ={' '}
          {E(rad(apDeg), rad(bpDeg)).toFixed(3)} · classical bound {classicalChshBound()} · Tsirelson {TSIRELSON.toFixed(3)}
          {sample ? ` · sampled S = ${sample.s.toFixed(3)} from ${sample.n} pairs` : ''}
        </p>
      </Panel>
    </Figure>
  );
}

function draw(canvas: HTMLCanvasElement, a: number, ap: number, b: number, bp: number, vis: number, S: number, sample: { n: number; s: number } | null): void {
  const ctx = sizeCanvas(canvas, W, H);
  clear(ctx, W, H, '#0c0d0e');
  // --- left: E(θ) with the four settings marked
  const px = 40;
  const py = 24;
  const pw = 330;
  const ph = 240;
  frame(ctx, px, py, pw, ph, 'E(Δθ) = V·cos(Δθ) and the four settings');
  const xOf = (d: number) => px + ((d + Math.PI) / (2 * Math.PI)) * pw;
  const yOf = (e: number) => py + ph / 2 - e * (ph / 2 - 24);
  ctx.strokeStyle = '#1d1e20';
  ctx.beginPath();
  ctx.moveTo(px, yOf(0));
  ctx.lineTo(px + pw, yOf(0));
  ctx.stroke();
  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i <= 200; i += 1) {
    const d = -Math.PI + (i / 200) * 2 * Math.PI;
    const y = yOf(vis * Math.cos(d));
    if (i === 0) ctx.moveTo(xOf(d), y);
    else ctx.lineTo(xOf(d), y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  const wrap = (d: number) => Math.atan2(Math.sin(d), Math.cos(d));
  const marks: [number, string, string][] = [
    [wrap(a - b), 'ab', GREEN],
    [wrap(a - bp), "ab′", RED],
    [wrap(ap - b), "a′b", GREEN],
    [wrap(ap - bp), "a′b′", GREEN],
  ];
  ctx.font = MONO;
  marks.forEach(([d, label, col], i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(xOf(d), yOf(vis * Math.cos(d)), 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText(label, xOf(d) + 7, yOf(vis * Math.cos(d)) - 6 + (i % 2) * 20);
  });
  ctx.fillStyle = MUTED;
  ctx.fillText('−180°', px, py + ph + 14);
  ctx.fillText('0', px + pw / 2 - 3, py + ph + 14);
  ctx.fillText('+180°', px + pw - 36, py + ph + 14);
  ctx.fillText('green: added   red: subtracted', px + 8, py + ph - 8);

  // --- right: S gauge
  const gx = 420;
  const gy = 24;
  const gw = 220;
  const gh = 240;
  frame(ctx, gx, gy, gw, gh, 'S');
  const sMax = 3;
  const yS = (s: number) => gy + gh - 20 - ((s + 0.5) / (sMax + 0.5)) * (gh - 40);
  const line = (s: number, label: string, col: string) => {
    ctx.strokeStyle = col;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(gx + 10, yS(s));
    ctx.lineTo(gx + gw - 10, yS(s));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.fillText(label, gx + 80, yS(s) - 4);
  };
  line(2, 'classical bound 2', AMBER);
  line(TSIRELSON, 'Tsirelson 2√2', VIOLET);
  line(0, '0', '#3a3c40');
  const bx = gx + 24;
  const top = yS(Math.max(0, S));
  const bottom = yS(Math.min(0, S));
  ctx.fillStyle = Math.abs(S) > 2 ? GREEN : BLUE;
  ctx.fillRect(bx, Math.min(top, bottom), 40, Math.abs(top - bottom));
  ctx.fillStyle = CREAM;
  ctx.fillText(`S = ${S.toFixed(3)}`, bx - 6, yS(0) + 16);
  if (sample) {
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - 6, yS(sample.s));
    ctx.lineTo(bx + 46, yS(sample.s));
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = MUTED;
    ctx.fillText(`${sample.n} pairs: ${sample.s.toFixed(2)}`, bx - 6, yS(0) + 30);
  }
}
