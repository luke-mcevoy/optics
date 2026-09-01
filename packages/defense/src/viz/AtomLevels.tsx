import { useState } from 'react';
import { Figure, Panel } from '../components/Figure.tsx';
import { Slider } from '../components/Slider.tsx';
import { Steps, type StepDef } from '../components/Steps.tsx';
import { PAPER } from '../data/paper.ts';
import { meanRadiusNm, worldScale } from '../physics/orbitals.ts';
import { AtomCloud } from '../viz3d/AtomCloud.tsx';
import { ScaleBar } from '../viz3d/ScaleBar.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';
import { LevelDiagram } from './plots/LevelDiagram.tsx';
import { RadialPlot } from './plots/RadialPlot.tsx';

type Mode = '5s' | '5p' | 'rydberg' | 'compare';
type Focus = 'a' | 'b' | 'c';

const STEP_MODE: readonly Mode[] = ['5s', '5s', '5p', 'rydberg', 'compare', '5s'];
const STEP_FOCUS: readonly Focus[] = ['b', 'c', 'b', 'b', 'b', 'a'];

export function AtomLevels() {
  const [step, setStep] = useState(0);
  const [n, setN] = useState<number>(PAPER.rydberg.n);
  const mode: Mode = STEP_MODE[step] ?? '5s';
  const focus: Focus = STEP_FOCUS[step] ?? 'b';
  const r5s = meanRadiusNm(5, 0);
  const rRyd = meanRadiusNm(n, 0);
  const ratio = rRyd / r5s;
  const compareScale = worldScale(n);
  // With the default worldScale, an s-state cloud has ⟨r⟩ = 1.5·(2.4/2.2) world units.
  const worldMeanR = 1.5 * (2.4 / 2.2);
  const barNm = (lengthWorld: number, meanNm: number) => (lengthWorld / worldMeanR) * meanNm;
  const plotN = mode === '5p' || mode === '5s' ? 5 : n;
  const plotL = mode === '5p' ? 1 : 0;
  const plotColor = mode === '5p' ? '#d4a24a' : mode === '5s' ? '#6ea8d4' : '#b08ad6';

  const steps: readonly StepDef[] = [
    {
      label: 'the electron',
      text: (
        <>
          Look at panel <strong>b</strong>. The blue fog is the one valence electron of a
          rubidium atom: each dot is a random draw from |ψ|², the probability of finding the
          electron there. The gold speck is the nucleus plus closed shells. The cloud&rsquo;s
          mean radius is ⟨r⟩ ≈ {r5s.toFixed(2)} nm — a quarter of a nanometre. This fuzzy
          object — not a little planet — is what the machine stores bits in.
        </>
      ),
    },
    {
      label: 'as a graph',
      text: (
        <>
          Now panel <strong>c</strong> — the same information as a curve. It plots r²R(r)²: how
          likely the electron is to sit at each distance from the nucleus. The dashed line marks
          the mean radius, ⟨r⟩ ≈ {r5s.toFixed(2)} nm. The wiggles near the origin are radial
          nodes — the standing-wave structure of the orbital. When you read a 3D cloud in this
          article, this curve is what it encodes.
        </>
      ),
    },
    {
      label: 'first excited state',
      text: (
        <>
          Panel <strong>b</strong> again: the electron promoted to 5p by one 780 nm photon —
          the D2 line. Note the shape change: a p orbital has a lobe structure, not a sphere.
          This is the state that imaging light cycles on when the camera reads the atom, and
          the state whose energy the 1,529 nm shield laser shifts.
        </>
      ),
    },
    {
      label: 'the Rydberg state',
      text: (
        <>
          Still panel <strong>b</strong>, but the scale bar just changed by two orders of
          magnitude. This is the same electron excited to n = {n}: mean radius grows as (n*)²,
          so ⟨r⟩ ≈ {rRyd.toFixed(0)} nm — about {ratio.toFixed(0)}× the ground state. Drag the n
          slider and watch it swell. A huge, loosely bound electron makes the atom violently
          polarizable — that is the property the entangling gate uses.
        </>
      ),
    },
    {
      label: 'same scale',
      text: (
        <>
          Both states drawn at one shared scale in panel <strong>b</strong>. The ground-state
          atom is the blue spark at the centre of the violet Rydberg cloud. This size contrast
          is the whole trick: in the ground state, atoms 2 μm apart ignore each other; excited
          to n = {n}, they shift each other&rsquo;s energies strongly enough to block a laser.
        </>
      ),
    },
    {
      label: 'the energy ladder',
      text: (
        <>
          Finally panel <strong>a</strong>: where these states sit in energy. The qubit lives in
          two hyperfine sublevels of the 5s ground state, 6.8 GHz apart — invisible on this
          scale. The 780/795 nm lines reach 5p. The Rydberg state is reached by a two-photon
          ladder: 420 nm up to an intermediate state, 1013 nm on to n = {PAPER.rydberg.n}.
          Every laser in the machine is an arrow on this diagram.
        </>
      ),
    },
  ];

  return (
    <div className="board">
      <Steps steps={steps} current={step} onStep={setStep} />
      {(mode === 'rydberg' || mode === 'compare') && (
        <Slider label="principal n" value={n} min={15} max={70} step={1} onChange={setN} />
      )}
      <Figure
        n="3"
        title="The valence electron of ⁸⁷Rb"
        caption={
          <>
            Hydrogenic radial shapes with the rubidium quantum defects setting the size: n* = n − δ
            with δ<sub>s</sub> = 3.13, δ<sub>p</sub> = 2.65, so 5s has n* ≈ 1.87 and ⟨r⟩ = ½(3n*² −
            ℓ(ℓ+1)) a₀. Panel a is the level diagram a spectroscopist would draw; the active state
            is brighter. Panel b samples |ψ|² in 3D — each point is one draw of the electron’s
            position; the gold speck is the nucleus. Panel c is the radial probability r²R(r)²
            with ⟨r⟩ marked.{' '}
            {mode === 'compare'
              ? `Both orbitals share one world scale, so 5s is the spark at the origin (⟨r⟩ ratio ≈ ${ratio.toFixed(0)}×).`
              : `⟨r⟩(5s) ≈ ${r5s.toFixed(2)} nm; ⟨r⟩(n=${n}) ≈ ${rRyd.toFixed(0)} nm.`}{' '}
            For n &gt; 12 the nodal pattern is drawn for n = 12 and the radius scales as (n*)².
          </>
        }
      >
        <Panel tag="a" title="Energy levels" dim={focus !== 'a'}>
          <LevelDiagram mode={mode} n={n} />
        </Panel>
        <Panel tag="b" title="|ψ|²  (orbit to inspect)" dim={focus !== 'b'}>
          <Stage3D camera={mode === '5s' || mode === '5p' ? [0, 1.1, 4.2] : [0, 2.2, 8]}>
            {mode === '5s' && (
              <>
                <AtomCloud n={5} l={0} color="#6ea8d4" count={22000} />
                <ScaleBar length={0.9} label={`${barNm(0.9, r5s).toFixed(2)} nm`} />
              </>
            )}
            {mode === '5p' && <AtomCloud n={5} l={1} color="#d4a24a" count={22000} />}
            {mode === 'rydberg' && (
              <>
                <AtomCloud n={n} l={0} color="#b08ad6" count={24000} size={0.04} opacity={0.75} />
                <ScaleBar length={1.1} label={`${barNm(1.1, rRyd).toFixed(0)} nm`} />
              </>
            )}
            {mode === 'compare' && (
              <>
                <AtomCloud n={n} l={0} color="#b08ad6" count={24000} size={0.04} opacity={0.65} scale={compareScale} />
                <AtomCloud n={5} l={0} color="#6ea8d4" count={8000} size={0.08} scale={compareScale} />
              </>
            )}
          </Stage3D>
        </Panel>
        <Panel tag="c" title={`Radial density, n=${plotN}, ℓ=${plotL}`} wide dim={focus !== 'c'}>
          <RadialPlot n={plotN} l={plotL} color={plotColor} />
        </Panel>
      </Figure>
    </div>
  );
}
