import { useMemo, useState } from 'react';
import { PAPER } from '../data/paper.ts';
import { Slider } from '../components/Slider.tsx';
import { Claim } from '../components/Claim.tsx';
import { Figure, Panel } from '../components/Figure.tsx';
import { RB87, collectionNA, poissonPmf, poissonSample, rayleighMetres } from '../physics/formulas.ts';

type Hidden = 'zero' | 'one' | 'lost';

const LAMBDA_M = RB87.d2Nm * 1e-9;

export function CameraMeasurement() {
  const [hidden, setHidden] = useState<Hidden>('one');
  const [signal, setSignal] = useState(70);
  const [background, setBackground] = useState(6);
  const [splitUm, setSplitUm] = useState<number>(PAPER.lattice.splitUm);
  const [shot, setShot] = useState(1);

  const na = PAPER.imaging.na;
  const eta = collectionNA(na);
  const rayleighUm = rayleighMetres(LAMBDA_M, na) * 1e6;
  const threshold = background + signal / 2;

  const exposure = useMemo(() => {
    let s = shot * 1664525 + 1013904223;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
    const muL = background + (hidden === 'zero' ? signal : 0);
    const muR = background + (hidden === 'one' ? signal : 0);
    const nL = poissonSample(muL, rand);
    const nR = poissonSample(muR, rand);
    const left = nL > threshold;
    const right = nR > threshold;
    const call: Hidden = left === right ? 'lost' : left ? 'zero' : 'one';
    const hits = scatterHits(splitUm, rayleighUm, nL, nR, rand);
    return { nL, nR, call, hits, muL, muR };
  }, [hidden, signal, background, splitUm, shot, threshold, rayleighUm]);

  return (
    <div className="board">
      <div className="mode-row">
        {(
          [
            ['zero', '|0⟩  pinned well'],
            ['one', '|1⟩  walked well'],
            ['lost', 'atom gone'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={hidden === id ? 'active' : undefined} onClick={() => setHidden(id)}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => setShot((n) => n + 1)}>
          Take another frame
        </button>
      </div>
      <div className="board-grid">
        <Slider
          label="Collected photons if occupied (toy)"
          value={signal}
          min={8}
          max={180}
          step={2}
          onChange={setSignal}
        />
        <Slider label="Background per well (toy)" value={background} min={0} max={30} step={1} onChange={setBackground} />
        <Slider
          label="Well spacing"
          value={splitUm}
          min={0.4}
          max={4}
          step={0.1}
          unit=" μm"
          display={splitUm.toFixed(1)}
          onChange={setSplitUm}
        />
      </div>
      <Figure
        n="9"
        title="A camera measurement is fluorescence, then a threshold"
        caption={
          <>
            <strong>a</strong>, After the lattice walk the bit is which well is occupied. 780 nm
            light drives the cycling transition; a 0.65-NA objective (Methods) collects a geometric
            fraction (1 − cos θ)/2 of 4π onto a Hamamatsu ORCA-Quest.{' '}
            <strong>b</strong>, One toy exposure. Spots are Gaussians whose 1/e² radius equals the
            Rayleigh length 0.61 λ/NA; a real image is an Airy disk. Dots are a Poisson draw, not
            a published photon budget — the paper does not report counts per frame.{' '}
            <strong>c</strong>, Software sums two regions of interest. Occupied / empty / both-empty
            is |0⟩ / |1⟩ / loss. The {PAPER.lattice.bitFlipPct}% bit-flip in Fig. 1b is dominated by
            pumping and the walk, not by this Poisson cartoon.
          </>
        }
      >
        <Panel tag="a" title="The record is a CMOS frame">
          <Chain eta={eta} />
        </Panel>
        <Panel tag="b" title="One exposure">
          <Frame
            splitUm={splitUm}
            rayleighUm={rayleighUm}
            hits={exposure.hits}
            nL={exposure.nL}
            nR={exposure.nR}
            call={exposure.call}
          />
        </Panel>
        <Panel tag="c" title="Counts in the two wells" wide>
          <Histogram
            background={background}
            signal={signal}
            threshold={threshold}
            nL={exposure.nL}
            nR={exposure.nR}
          />
        </Panel>
      </Figure>
      <div className="claim-row">
        <Claim value={na} unit="NA" source="Methods, Special Optics" note={PAPER.imaging.camera} />
        <Claim
          value={rayleighUm.toFixed(2)}
          unit="μm  0.61 λ/NA"
          source="λ = 780.241 nm (D2)"
          note="wells are 2 μm apart"
        />
        <Claim
          value={`${(eta * 100).toFixed(1)}%`}
          unit="geometric collection"
          source="(1 − cos θ)/2, θ = arcsin(NA)"
          note="air, one side; ignores QE and coatings"
        />
        <Claim
          value={labelOf(exposure.call)}
          unit="this frame"
          source={`${exposure.nL} left · ${exposure.nR} right`}
          note={exposure.call === hidden ? 'matches the hidden state' : 'Poisson misread — retake'}
        />
      </div>
    </div>
  );
}

const labelOf = (state: Hidden): string => {
  if (state === 'zero') return '|0⟩';
  if (state === 'one') return '|1⟩';
  return 'loss';
};

function Chain({ eta }: { eta: number }) {
  return (
    <svg viewBox="0 0 360 210" width="100%" role="img" aria-label="Fluorescence imaging chain">
      <text x="16" y="22" fill="#8b8680" fontSize="11">
        atom
      </text>
      <circle cx="40" cy="78" r="7" fill="#f5b942" />
      <line x1="40" y1="86" x2="40" y2="124" stroke="#5ec8e5" strokeWidth="1.5" />
      <text x="16" y="142" fill="#5ec8e5" fontSize="11">
        780 nm
      </text>
      <text x="16" y="156" fill="#8b8680" fontSize="10">
        scatter
      </text>

      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="52"
          y1="78"
          x2="128"
          y2={38 + i * 20}
          stroke="#5ec8e5"
          strokeOpacity={0.35 + 0.12 * i}
        />
      ))}

      <path d="M128 36 L168 78 L128 120 Z" fill="none" stroke="#e8e4dc" strokeWidth="1.5" />
      <text x="118" y="142" fill="#e8e4dc" fontSize="11">
        NA 0.65
      </text>
      <text x="118" y="156" fill="#8b8680" fontSize="10">
        {(eta * 100).toFixed(1)}% of 4π
      </text>

      <rect x="188" y="48" width="72" height="60" fill="#12181e" stroke="#4f555c" />
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 7 }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={190 + c * 10}
            y={50 + r * 9.4}
            width="9"
            height="8.5"
            fill={r === 2 && (c === 2 || c === 4) ? '#5ec8e5' : '#1a222a'}
          />
        )),
      )}
      <text x="188" y="128" fill="#e8e4dc" fontSize="11">
        ORCA-Quest
      </text>
      <text x="188" y="142" fill="#8b8680" fontSize="10">
        qCMOS frame
      </text>

      <text x="278" y="64" fill="#8ec8ff" fontSize="12">
        left ROI
      </text>
      <text x="278" y="86" fill="#f3d48a" fontSize="12">
        right ROI
      </text>
      <text x="278" y="118" fill="#e8e4dc" fontSize="12">
        threshold
      </text>
      <text x="278" y="142" fill="#8b8680" fontSize="10">
        0 / 1 / hole
      </text>
    </svg>
  );
}

function Frame(props: {
  splitUm: number;
  rayleighUm: number;
  hits: readonly { x: number; y: number; well: 'L' | 'R' }[];
  nL: number;
  nR: number;
  call: Hidden;
}) {
  const w = 360;
  const h = 210;
  const pad = 28;
  const inner = w - pad * 2;
  const scale = inner / 6;
  const x0 = pad + inner / 2;
  const y0 = 108;
  const xOf = (um: number) => x0 + um * scale;
  const left = -props.splitUm / 2;
  const right = props.splitUm / 2;
  const rPx = Math.max(6, props.rayleighUm * scale);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Toy fluorescence frame of two wells">
      <rect x="10" y="18" width="340" height="174" fill="#0c1014" stroke="#2c3640" />
      <ellipse cx={xOf(left)} cy={y0} rx={rPx} ry={rPx * 0.85} fill="#8ec8ff" opacity="0.12" />
      <ellipse cx={xOf(right)} cy={y0} rx={rPx} ry={rPx * 0.85} fill="#f3d48a" opacity="0.12" />
      <rect
        x={xOf(left) - rPx * 1.15}
        y={y0 - rPx * 1.15}
        width={rPx * 2.3}
        height={rPx * 2.3}
        fill="none"
        stroke="#8ec8ff"
        strokeDasharray="3 3"
      />
      <rect
        x={xOf(right) - rPx * 1.15}
        y={y0 - rPx * 1.15}
        width={rPx * 2.3}
        height={rPx * 2.3}
        fill="none"
        stroke="#f3d48a"
        strokeDasharray="3 3"
      />
      {props.hits.map((hit, i) => (
        <circle
          key={i}
          cx={xOf(hit.x)}
          cy={y0 + hit.y * scale}
          r="1.35"
          fill={hit.well === 'L' ? '#8ec8ff' : '#f3d48a'}
        />
      ))}
      <text x={xOf(left)} y="44" textAnchor="middle" fill="#8ec8ff" fontSize="11">
        |0⟩  {props.nL}
      </text>
      <text x={xOf(right)} y="44" textAnchor="middle" fill="#f3d48a" fontSize="11">
        |1⟩  {props.nR}
      </text>
      <text x="20" y="180" fill="#e8e4dc" fontSize="11">
        call {labelOf(props.call)}
      </text>
      <text x="340" y="180" textAnchor="end" fill="#8b8680" fontSize="10">
        {props.splitUm.toFixed(1)} μm · Rayleigh {props.rayleighUm.toFixed(2)} μm
      </text>
    </svg>
  );
}

function Histogram(props: {
  background: number;
  signal: number;
  threshold: number;
  nL: number;
  nR: number;
}) {
  const w = 640;
  const h = 210;
  const pad = { l: 36, r: 16, t: 18, b: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const kMax = Math.max(40, Math.ceil(props.background + props.signal + 4 * Math.sqrt(props.background + props.signal)));
  const empty = Array.from({ length: kMax + 1 }, (_, k) => poissonPmf(k, props.background));
  const occ = Array.from({ length: kMax + 1 }, (_, k) => poissonPmf(k, props.background + props.signal));
  const peak = Math.max(...empty, ...occ, 1e-9);
  const x = (k: number) => pad.l + (k / kMax) * innerW;
  const y = (p: number) => pad.t + innerH - (p / peak) * innerH;
  const poly = (values: number[]) => values.map((p, k) => `${x(k)},${y(p)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Poisson count histograms for empty and occupied wells">
      <polyline points={poly(empty)} fill="none" stroke="#8b8680" strokeWidth="1.6" />
      <polyline points={poly(occ)} fill="none" stroke="#5ec8e5" strokeWidth="1.8" />
      <line x1={x(props.threshold)} y1={pad.t} x2={x(props.threshold)} y2={pad.t + innerH} stroke="#e8e4dc" strokeDasharray="4 3" />
      <line x1={x(props.nL)} y1={pad.t + 8} x2={x(props.nL)} y2={pad.t + innerH} stroke="#8ec8ff" />
      <line x1={x(props.nR)} y1={pad.t + 8} x2={x(props.nR)} y2={pad.t + innerH} stroke="#f3d48a" />
      <text x={pad.l} y={h - 8} fill="#8b8680" fontSize="10">
        photoelectrons in one ROI (toy Poisson)
      </text>
      <text x={pad.l + 4} y={pad.t + 12} fill="#8b8680" fontSize="10">
        empty
      </text>
      <text x={pad.l + 52} y={pad.t + 12} fill="#5ec8e5" fontSize="10">
        occupied
      </text>
      <text x={x(props.threshold) + 4} y={pad.t + 12} fill="#e8e4dc" fontSize="10">
        threshold
      </text>
      <text x={Math.min(x(props.nL) + 4, w - 80)} y={pad.t + 28} fill="#8ec8ff" fontSize="10">
        left {props.nL}
      </text>
      <text x={Math.min(x(props.nR) + 4, w - 80)} y={pad.t + 42} fill="#f3d48a" fontSize="10">
        right {props.nR}
      </text>
    </svg>
  );
}

const scatterHits = (
  splitUm: number,
  rayleighUm: number,
  nL: number,
  nR: number,
  rand: () => number,
): { x: number; y: number; well: 'L' | 'R' }[] => {
  const sigma = rayleighUm / 2;
  const left = -splitUm / 2;
  const right = splitUm / 2;
  const out: { x: number; y: number; well: 'L' | 'R' }[] = [];
  const dump = (well: 'L' | 'R', count: number, cx: number) => {
    const n = Math.min(count, 140);
    for (let i = 0; i < n; i += 1) {
      const u = Math.max(rand(), Number.EPSILON);
      const v = rand();
      const r = sigma * Math.sqrt(-2 * Math.log(u));
      const phi = 2 * Math.PI * v;
      out.push({ x: cx + r * Math.cos(phi), y: r * Math.sin(phi), well });
    }
  };
  dump('L', nL, left);
  dump('R', nR, right);
  return out;
};
