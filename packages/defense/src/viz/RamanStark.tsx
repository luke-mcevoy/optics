import { useMemo, useState } from 'react';
import { PAPER } from '../data/paper.ts';
import { Slider } from '../components/Slider.tsx';
import { Claim } from '../components/Claim.tsx';
import { Figure, Panel } from '../components/Figure.tsx';
import { Steps, type StepDef } from '../components/Steps.tsx';
import {
  RB87,
  acStark,
  mhzToHz,
  ramanDifferentialStark,
  scatteringRate,
  twoPhotonRabi,
} from '../physics/formulas.ts';
import { AtomCloud } from '../viz3d/AtomCloud.tsx';
import { LaserRay, TweezerBeam } from '../viz3d/Optics.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';

function LambdaDiagram({
  deltaGHz,
  o1,
  o2,
}: {
  deltaGHz: number;
  o1: number;
  o2: number;
}) {
  const widthFor = (omegaMHz: number) => 1 + 5 * (omegaMHz / 200);
  return (
    <svg viewBox="0 0 360 210" width="100%" role="img" aria-label="Lambda-system energy diagram">
      <defs>
        <marker id="raman-arrow-cyan" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="#5ec8e5" />
        </marker>
        <marker id="raman-arrow-gold" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="#e8a64b" />
        </marker>
      </defs>
      <line x1="48" y1="168" x2="143" y2="168" stroke="#e8e4dc" strokeWidth="2" />
      <line x1="217" y1="151" x2="312" y2="151" stroke="#e8e4dc" strokeWidth="2" />
      <text x="70" y="190" fill="#e8e4dc" fontSize="13">|0⟩</text>
      <text x="268" y="174" fill="#e8e4dc" fontSize="13">|1⟩</text>
      <line x1="326" y1="151" x2="326" y2="168" stroke="#8b8680" />
      <line x1="321" y1="151" x2="331" y2="151" stroke="#8b8680" />
      <line x1="321" y1="168" x2="331" y2="168" stroke="#8b8680" />
      <text x="277" y="198" fill="#8b8680" fontSize="11">6.8 GHz</text>

      <line x1="105" y1="31" x2="255" y2="31" stroke="#4f555c" strokeWidth="1.5" />
      <text x="262" y="35" fill="#8b8680" fontSize="11">5P resonance</text>
      <line x1="105" y1="62" x2="255" y2="62" stroke="#e8e4dc" strokeWidth="1.5" strokeDasharray="6 4" />
      <text x="262" y="66" fill="#e8e4dc" fontSize="11">virtual 5P</text>
      <line x1="91" y1="31" x2="91" y2="62" stroke="#b8b3aa" />
      <line x1="86" y1="31" x2="96" y2="31" stroke="#b8b3aa" />
      <line x1="86" y1="62" x2="96" y2="62" stroke="#b8b3aa" />
      <text x="17" y="51" fill="#b8b3aa" fontSize="11">Δ = {deltaGHz.toFixed(0)} GHz</text>

      <line
        x1="113"
        y1="162"
        x2="168"
        y2="66"
        stroke="#5ec8e5"
        strokeWidth={widthFor(o1)}
        markerEnd="url(#raman-arrow-cyan)"
      />
      <line
        x1="263"
        y1="145"
        x2="196"
        y2="66"
        stroke="#e8a64b"
        strokeWidth={widthFor(o2)}
        markerEnd="url(#raman-arrow-gold)"
      />
      <text x="111" y="112" fill="#5ec8e5" fontSize="11">Ω₁ = {o1} MHz</text>
      <text x="215" y="108" fill="#e8a64b" fontSize="11">Ω₂ = {o2} MHz</text>
    </svg>
  );
}

function RamanCurves({
  deltaGHz,
  o1,
  o2,
}: {
  deltaGHz: number;
  o1: number;
  o2: number;
}) {
  const w = 420;
  const h = 230;
  const pad = { l: 48, r: 52, t: 18, b: 38 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const minDelta = 50;
  const maxDelta = 2500;
  const samples = Array.from({ length: 100 }, (_, index) => {
    const delta = minDelta + (index / 99) * (maxDelta - minDelta);
    return {
      delta,
      effectiveMHz: twoPhotonRabi(mhzToHz(o1), mhzToHz(o2), delta * 1e9) / 1e6,
      starkKHz: ramanDifferentialStark(mhzToHz(o1), mhzToHz(o2), delta * 1e9) / 1e3,
    };
  });
  const maxEffective = samples[0]?.effectiveMHz ?? 0;
  const maxAbsStark = Math.abs(samples[0]?.starkKHz ?? 0);
  const x = (delta: number) => pad.l + ((delta - minDelta) / (maxDelta - minDelta)) * innerW;
  const yEffective = (value: number) => pad.t + innerH - (value / maxEffective) * innerH;
  const yStark = (value: number) =>
    maxAbsStark === 0 ? pad.t + innerH / 2 : pad.t + innerH / 2 - (value / maxAbsStark) * (innerH / 2);
  const effectivePoints = samples.map((point) => `${x(point.delta)},${yEffective(point.effectiveMHz)}`).join(' ');
  const starkPoints = samples.map((point) => `${x(point.delta)},${yStark(point.starkKHz)}`).join(' ');
  const currentX = x(deltaGHz);
  const paperX = x(PAPER.raman.intermediateDetuningGHz);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Raman coupling and AC Stark shift versus detuning">
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#4f555c" />
      <line x1={pad.l + innerW} y1={pad.t} x2={pad.l + innerW} y2={pad.t + innerH} stroke="#4f555c" />
      <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="#4f555c" />
      <line x1={pad.l} y1={pad.t + innerH / 2} x2={pad.l + innerW} y2={pad.t + innerH / 2} stroke="#252a30" />
      <polyline points={effectivePoints} fill="none" stroke="#5ec8e5" strokeWidth="2" />
      <polyline points={starkPoints} fill="none" stroke="#e8a64b" strokeWidth="2" />
      <line x1={paperX} y1={pad.t} x2={paperX} y2={pad.t + innerH} stroke="#e8e4dc" strokeDasharray="4 4" />
      <text x={paperX + 4} y={pad.t + 11} fill="#e8e4dc" fontSize="10">paper: 550 GHz</text>
      <line x1={currentX} y1={pad.t} x2={currentX} y2={pad.t + innerH} stroke="#ff7a7a" strokeWidth="1.5" />
      <circle
        cx={currentX}
        cy={yEffective(twoPhotonRabi(mhzToHz(o1), mhzToHz(o2), deltaGHz * 1e9) / 1e6)}
        r="3"
        fill="#5ec8e5"
      />
      <circle
        cx={currentX}
        cy={yStark(ramanDifferentialStark(mhzToHz(o1), mhzToHz(o2), deltaGHz * 1e9) / 1e3)}
        r="3"
        fill="#e8a64b"
      />
      <text x={pad.l} y={h - 8} fill="#8b8680" fontSize="10">Δ (GHz)</text>
      <text x={pad.l - 5} y={pad.t + 4} textAnchor="end" fill="#5ec8e5" fontSize="10">{maxEffective.toFixed(2)}</text>
      <text x={pad.l - 5} y={pad.t + innerH + 3} textAnchor="end" fill="#5ec8e5" fontSize="10">0</text>
      <text x={pad.l + innerW + 5} y={pad.t + 4} fill="#e8a64b" fontSize="10">{maxAbsStark.toFixed(1)}</text>
      <text x={pad.l + innerW + 5} y={pad.t + innerH + 3} fill="#e8a64b" fontSize="10">{(-maxAbsStark).toFixed(1)}</text>
      <text x="12" y="113" fill="#5ec8e5" fontSize="10" transform="rotate(-90 12 113)">Ω_eff (MHz)</text>
      <text x={w - 8} y="113" fill="#e8a64b" fontSize="10" transform={`rotate(90 ${w - 8} 113)`}>δ_AC (kHz)</text>
      <text x={pad.l + innerW - 48} y={h - 8} fill="#ff7a7a" fontSize="10">live Δ</text>
    </svg>
  );
}

export function RamanStark() {
  const [step, setStep] = useState(0);
  const [deltaGHz, setDeltaGHz] = useState<number>(PAPER.raman.intermediateDetuningGHz);
  const [o1, setO1] = useState(80);
  const [o2, setO2] = useState(80);
  const [probe, setProbe] = useState(1.2);

  const focus: 'a' | 'b' | 'c' = (['a', 'b', 'b', 'c'] as const)[step] ?? 'a';

  const steps: readonly StepDef[] = [
    {
      label: 'the bridge',
      text: (
        <>
          Panel <strong>a</strong>: the two qubit levels |0⟩ and |1⟩ sit 6.8 GHz apart at the
          bottom. Driving that microwave gap directly with light is impossible — so two lasers
          build a bridge. The cyan beam takes the atom <em>toward</em> the 5P excited state, the
          gold beam brings it back down into |1⟩. Crucially, they meet at a <em>virtual</em>{' '}
          level a distance Δ from the real 5P line (drawn below it here — the paper gives only
          |Δ| = 550 GHz, so the side is a drawing convention): the atom rotates from |0⟩ to |1⟩
          without ever actually visiting 5P.
        </>
      ),
    },
    {
      label: 'why detune so far',
      text: (
        <>
          Panel <strong>b</strong>: the trade that fixes Δ. The rotation rate (cyan curve,
          Ω<sub>eff</sub> = Ω₁Ω₂/2Δ) falls as 1/Δ — bad. But real photon scattering off 5P,
          which destroys the qubit, falls as 1/Δ² — twice as fast. So you detune as far as
          laser power allows. The dashed line marks the paper&rsquo;s choice, Δ = 550 GHz,
          giving 5×10⁻⁵ scattering events per pulse.
        </>
      ),
    },
    {
      label: 'the imbalance knob',
      text: (
        <>
          Still panel <strong>b</strong>, gold curve: we just made the two legs unequal
          (Ω₁ ≠ Ω₂). Each beam also Stark-shifts the level it touches, and unequal beams shift
          |0⟩ and |1⟩ differently: δ<sub>AC</sub> = (Ω₁² − Ω₂²)/4Δ. That looks exactly like a
          fake magnetic field along z — a phase error accumulating on every atom the beam
          grazes. The paper&rsquo;s answers are a larger Δ (550 GHz now, 2.5 THz proposed) and
          composite pulses like SCROFULOUS that are robust to the residual shift; balancing
          the legs is the textbook knob shown here.
        </>
      ),
    },
    {
      label: 'in space',
      text: (
        <>
          Panel <strong>c</strong>: the same three beams as geometry. The amber cone is the
          852 nm tweezer holding the atom. The cyan and gold rays are the two Raman legs
          crossing at the atom. The red cone from above is the separate 1,529 nm shield beam:
          it Stark-shifts only the 5P level, detuning stored atoms out of reach of imaging
          light scattered from the neighbouring readout zone.
        </>
      ),
    },
  ];

  const applyStep = (i: number) => {
    setStep(i);
    if (i === 1) {
      setDeltaGHz(PAPER.raman.intermediateDetuningGHz);
      setO1(80);
      setO2(80);
    }
    if (i === 2) {
      setO1(160);
      setO2(60);
    }
    if (i === 3) {
      setO1(80);
      setO2(80);
    }
  };

  const computed = useMemo(() => {
    const delta = deltaGHz * 1e9;
    const w1 = mhzToHz(o1);
    const w2 = mhzToHz(o2);
    const omegaEff = twoPhotonRabi(w1, w2, delta);
    const stark = ramanDifferentialStark(w1, w2, delta);
    const scatter = scatteringRate(w1, RB87.gammaD2Hz, delta) + scatteringRate(w2, RB87.gammaD2Hz, delta);
    const piTime = omegaEff > 0 ? 1 / (2 * omegaEff) : Infinity;
    const tweezerOmega = mhzToHz(40);
    const tweezerDelta = -((852 - 780) / 780) * (3e8 / 852e-9);
    const trapStark = acStark(tweezerOmega, tweezerDelta);
    const shieldShiftGHz = 6 * (probe / 1.2);
    return { omegaEff, stark, scatter, piTime, trapStark, shieldShiftGHz };
  }, [deltaGHz, o1, o2, probe]);

  return (
    <div className="board">
      <Steps steps={steps} current={step} onStep={applyStep} />
      <div className="board-grid">
        <Slider
          label="Raman intermediate detuning Δ"
          value={deltaGHz}
          min={50}
          max={2500}
          step={10}
          unit=" GHz"
          display={String(deltaGHz)}
          onChange={setDeltaGHz}
        />
        <Slider label="Ω₁" value={o1} min={10} max={200} step={1} unit=" MHz" onChange={setO1} />
        <Slider label="Ω₂" value={o2} min={10} max={200} step={1} unit=" MHz" onChange={setO2} />
        <Slider
          label="1,529 nm shield power"
          value={probe}
          min={0}
          max={4}
          step={0.05}
          unit=" W"
          display={probe.toFixed(2)}
          onChange={setProbe}
        />
      </div>
      <Figure
        n="4"
        title="Far-detuned Raman control and shielding"
        caption={
          <>
            <strong>a</strong>, Λ-system with cyclic frequencies Ω/2π and Δ/2π displayed in MHz and GHz.
            Arrow widths follow the live Ω sliders. <strong>b</strong>, Two-level estimates from
            Ω<sub>eff</sub> = Ω₁Ω₂/2Δ and δ<sub>AC</sub> = (Ω₁² − Ω₂²)/4Δ; the paper operated at
            Δ/2π = 550 GHz. <strong>c</strong>, geometry only; electron clouds and beam waists are
            enlarged and not to scale. Assumes a far-detuned two-level model. The 1,529 nm shield
            card is a linear interpolation of 1.2 W → 6 GHz, not a multilevel Stark calculation.
          </>
        }
      >
        <Panel tag="a" title="Λ system" dim={focus !== 'a'}>
          <LambdaDiagram deltaGHz={deltaGHz} o1={o1} o2={o2} />
        </Panel>
        <Panel tag="b" title="Live two-level curves" dim={focus !== 'b'}>
          <RamanCurves deltaGHz={deltaGHz} o1={o1} o2={o2} />
        </Panel>
        <Panel tag="c" title="Beam geometry (not to scale)" wide dim={focus !== 'c'}>
          <Stage3D camera={[2.4, 1.8, 5.2]}>
            <TweezerBeam />
            <AtomCloud n={5} l={0} color={o1 === o2 ? '#8ec8ff' : '#f3d48a'} count={16000} />
            <LaserRay start={[-3.2, -1.4, 0]} end={[0.05, 0.05, 0]} color="#5ec8e5" />
            <LaserRay start={[3.2, -1.4, 0]} end={[-0.05, 0.05, 0]} color="#e8a64b" />
            <mesh position={[0, 2.6, 0]}>
              <cylinderGeometry args={[0.35, 0.18, 2.2, 20, 1, true]} />
              <meshBasicMaterial color="#ff7a7a" transparent opacity={0.08 + 0.06 * probe} />
            </mesh>
          </Stage3D>
        </Panel>
      </Figure>
      <div className="claim-row">
        <Claim
          value={(computed.omegaEff / 1e6).toFixed(3)}
          unit="MHz  Ω_eff"
          source="Ω_eff = Ω₁Ω₂ / 2Δ"
          note="two-photon Rabi"
        />
        <Claim
          value={(computed.stark / 1e3).toFixed(2)}
          unit="kHz  δ_AC"
          source="(Ω₁² − Ω₂²) / 4Δ"
          note="Raman differential Stark"
        />
        <Claim
          value={(computed.piTime * 1e6).toFixed(2)}
          unit="μs  π time"
          source="1 / (2 f_Rabi), cyclic-frequency convention"
        />
        <Claim
          value={computed.scatter.toExponential(2)}
          unit="s⁻¹ scatter"
          source="Γ Ω² / 4Δ²"
        />
        <Claim
          value={computed.shieldShiftGHz.toFixed(2)}
          unit="GHz on 5P₃/₂"
          source="linear interpolation: 1.2 W → 6 GHz"
        />
      </div>
    </div>
  );
}

