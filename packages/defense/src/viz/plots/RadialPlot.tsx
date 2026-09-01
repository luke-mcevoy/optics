import { useMemo } from 'react';
import { meanRadiusA0, radialProbability } from '../../physics/orbitals.ts';

export function RadialPlot({ n, l, color }: { n: number; l: number; color: string }) {
  const { r, p } = useMemo(() => radialProbability(n, l), [n, l]);
  const mean = meanRadiusA0(n, l);
  const rMax = 3.2 * n * n;
  const w = 320;
  const h = 168;
  const pad = { l: 36, r: 12, t: 14, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = Array.from({ length: r.length }, (_, i) => {
    const x = pad.l + ((r[i] ?? 0) / rMax) * innerW;
    const y = pad.t + innerH - (p[i] ?? 0) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const mx = pad.l + (mean / rMax) * innerW;

  return (
    <svg className="plot" viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Radial probability density">
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#3a3a3c" />
      <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="#3a3a3c" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" />
      <line x1={mx} y1={pad.t} x2={mx} y2={pad.t + innerH} stroke="#e8e4dc" strokeDasharray="3 3" />
      <text x={mx + 4} y={pad.t + 10} fill="#e8e4dc" fontSize="10" fontFamily="IBM Plex Mono, monospace">
        ⟨r⟩
      </text>
      <text x={pad.l} y={h - 6} fill="#8b8680" fontSize="10" fontFamily="Source Sans 3, sans-serif">
        r (Bohr)
      </text>
      <text
        x="12"
        y={pad.t + innerH / 2}
        fill="#8b8680"
        fontSize="10"
        fontFamily="Source Sans 3, sans-serif"
        transform={`rotate(-90 12 ${pad.t + innerH / 2})`}
      >
        r²R(r)²
      </text>
    </svg>
  );
}
