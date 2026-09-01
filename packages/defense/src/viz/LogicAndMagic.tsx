import { useMemo, useState } from 'react';
import { PAPER } from '../data/paper.ts';
import { Slider } from '../components/Slider.tsx';
import { Claim } from '../components/Claim.tsx';
import { tGateAngularSpacingRad } from '../physics/formulas.ts';

export function LogicAndMagic() {
  const [tGates, setTGates] = useState<number>(PAPER.codes.tGatesShown);
  const [cnots, setCnots] = useState<number>(PAPER.logic.optimalCnotsPerRound);
  const spacing = useMemo(() => tGateAngularSpacingRad(tGates), [tGates]);

  const points = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const n = Math.max(1, 2 ** Math.max(0, tGates - 1));
    for (let k = 0; k < n; k += 1) {
      const th = (k / n) * Math.PI * 2 * (tGates === 0 ? 0 : 1);
      const phi = (Math.PI / 8) * tGates + th * 0.15;
      out.push({
        x: Math.sin(phi) * Math.cos(th),
        y: Math.cos(phi),
      });
    }
    return out;
  }, [tGates]);

  return (
    <div className="board">
      <div className="board-grid">
        <Slider label="T gates in the synthesis" value={tGates} min={0} max={6} step={1} onChange={setTGates} />
        <Slider label="transversal CNOTs per QEC round" value={cnots} min={1} max={8} step={1} onChange={setCnots} />
      </div>
      <svg className="sketch" viewBox="0 0 560 240" width={560} height={240} role="img">
        <circle cx="140" cy="120" r="78" fill="none" stroke="#2c3640" />
        <ellipse cx="140" cy="120" rx="78" ry="28" fill="none" stroke="#24303a" />
        <line x1="140" y1="42" x2="140" y2="198" stroke="#24303a" />
        {points.map((p, i) => (
          <circle key={i} cx={140 + 78 * p.x} cy={120 - 78 * p.y} r="4" fill="#c9a0ff" />
        ))}
        <text x="40" y="28" fill="#c9b896" fontSize="12" fontFamily="IBM Plex Sans, sans-serif">
          reachable Bloch points after {tGates} T-teleportations
        </text>
        <rect x="280" y="40" width="240" height="160" fill="#12181e" stroke="#2c3640" />
        <text x="296" y="64" fill="#8ec8ff" fontSize="12" fontFamily="IBM Plex Mono, monospace">
          transversal: logic on data
        </text>
        <text x="296" y="84" fill="#7d8b99" fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
          syndrome only removes entropy
        </text>
        <text x="296" y="120" fill="#f3d48a" fontSize="12" fontFamily="IBM Plex Mono, monospace">
          lattice surgery: logic in ancilla
        </text>
        <text x="296" y="140" fill="#7d8b99" fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
          measurements must themselves be correct
        </text>
        <text x="296" y="176" fill="#e8dfc8" fontSize="12" fontFamily="IBM Plex Mono, monospace">
          paper optimum ≈ {PAPER.logic.optimalCnotsPerRound} CNOTs / round
        </text>
        <text x="296" y="194" fill="#a51c30" fontSize="11" fontFamily="IBM Plex Mono, monospace">
          you chose {cnots}
        </text>
      </svg>
      <div className="claim-row">
        <Claim
          value={((spacing * 180) / Math.PI).toFixed(2)}
          unit="° typical spacing"
          source="π / 2^{N+1} toy SK scaling"
        />
        <Claim value={PAPER.codes.chsh} unit="CHSH" source="error-corrected Bell test, Ext. Data Fig. 9f" />
        <Claim value={PAPER.codes.reedMuller} unit="Reed–Muller" source="transversal T at 45°" />
      </div>
    </div>
  );
}
