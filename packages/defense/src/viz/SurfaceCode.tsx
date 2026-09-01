import { useMemo, useState } from 'react';
import { PAPER } from '../data/paper.ts';
import { Slider } from '../components/Slider.tsx';
import { Claim } from '../components/Claim.tsx';
import { surfaceLogicalError } from '../physics/formulas.ts';
import { sampleOrbital, worldScale } from '../physics/orbitals.ts';
import { AtomCloudField } from '../viz3d/AtomCloud.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';

export function SurfaceCode() {
  const [d, setD] = useState(5);
  const [pPct, setPPct] = useState(1.1);
  const [loss, setLoss] = useState(true);
  const local = useMemo(() => sampleOrbital({ n: 5, l: 0, count: 800, seed: 9 }), []);
  const scale = worldScale(5, 0.48);
  const sites = useMemo(() => {
    const out: { position: [number, number, number]; color: string }[] = [];
    const lost = Math.floor((d * d) * 0.35);
    for (let r = 0; r < d; r += 1) {
      for (let c = 0; c < d; c += 1) {
        const i = r * d + c;
        out.push({
          position: [(c - (d - 1) / 2) * 0.95, 0, (r - (d - 1) / 2) * 0.95],
          color: loss && i === lost ? '#a51c30' : '#f5b942',
        });
      }
    }
    return out;
  }, [d, loss]);

  const numbers = useMemo(() => {
    const p = pPct / 100;
    return { ratio: surfaceLogicalError(p, 3) / surfaceLogicalError(p, 5) };
  }, [pPct]);

  return (
    <div className="board">
      <div className="board-grid">
        <Slider label="code distance d" value={d} min={3} max={7} step={2} onChange={setD} />
        <Slider label="physical p" value={pPct} min={0.2} max={4} step={0.05} unit=" %" display={pPct.toFixed(2)} onChange={setPPct} />
        <label className="slider">
          <span className="slider-row">
            <span>show atom loss</span>
            <input type="checkbox" checked={loss} onChange={(e) => setLoss(e.target.checked)} />
          </span>
        </label>
      </div>
      <Stage3D
        camera={[0, 5.2, 7.4]}
        lookingAt="A surface-code block: one atom per lattice site"
        keys={[
          { color: '#f5b942', label: 'Gold — a data qubit that is still there' },
          { color: '#a51c30', label: 'Crimson — a lost atom. The code now has a hole.' },
        ]}
        note="Each knot is one physical qubit. The paper’s 2.14× below-threshold number is not the toy p^{(d+1)/2} card below."
        caption="Grid size follows the d slider. The toy ratio card always compares d=3 vs d=5 and is not a fit to Fig. 2d."
      >
        <AtomCloudField local={local} sites={sites} scale={scale} size={0.03} />
      </Stage3D>
      <div className="claim-row">
        <Claim
          value={PAPER.qec.belowThreshold.toFixed(2)}
          unit="×  d=5 vs d=3"
          source="Fig. 2d"
          note={`± ${PAPER.qec.belowThresholdUnc}`}
        />
        <Claim value={PAPER.qec.d5LeprPct.toFixed(2)} unit="% LEPR (d=5)" source="hybrid ML + MLE" />
        <Claim value={numbers.ratio.toFixed(2)} unit="×  toy p^{(d+1)/2}" source="slider model, not a paper fit" />
      </div>
    </div>
  );
}
