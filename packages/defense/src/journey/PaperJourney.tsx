import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { PAPER } from '../data/paper.ts';
import { PAPER_STOPS, PAPER_URL, SURFACE_RESULTS } from '../data/paperJourney.ts';
import type { PaperControls } from './PaperScene.tsx';
import './journey.css';

const Scene = lazy(() => import('./PaperScene.tsx'));
const initial: PaperControls = { zone: 0, readState: 'zero', readStep: 0, distance: 5, gateMode: 'transversal', gateStep: 0, universalStep: 0, cycleStep: 0, cycle: 1 };
function getChapter() {
  const n = Number(window.location.hash.split('/')[2] ?? 0);
  return Number.isInteger(n) ? Math.max(0, Math.min(PAPER_STOPS.length - 1, n)) : 0;
}
function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" style={back ? { transform: 'rotate(180deg)' } : undefined}><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
function Steps({ values, current, set }: { values: string[]; current: number; set: (step: number) => void }) {
  return <div className="paper-steps">{values.map((label, i) => <button key={label} aria-pressed={current === i} onClick={() => set(i)}><small>{i + 1}</small>{label}</button>)}</div>;
}

function MeasuredChart({ distance }: { distance: number }) {
  return <div className="paper-measured-chart" aria-label="Reported logical error per correction round">
    <span>REPORTED LOGICAL ERROR PER ROUND</span>
    <svg viewBox="0 0 340 148" role="img" aria-label="Distance 3: 1.33 plus or minus 0.04 percent. Distance 5: 0.62 plus or minus 0.03 percent.">
      {[0, 0.5, 1, 1.5].map((v) => <g key={v}><line x1="40" y1={116 - v * 59} x2="326" y2={116 - v * 59} stroke="#29414a" /><text x="31" y={120 - v * 59} textAnchor="end" fill="#9fb7c0">{v.toFixed(1)}%</text></g>)}
      {SURFACE_RESULTS.map((p, i) => <g key={p.d} opacity={p.d === distance ? 1 : 0.5}>
        <rect x={84 + i * 137} y={116 - p.errorPct * 59} width="52" height={p.errorPct * 59} rx="2" fill={i === 0 ? '#e3bc80' : '#79d8d2'} />
        <path d={`M${102 + i * 137},${116 - (p.errorPct + p.uncertaintyPct) * 59}h16m-8,0v${p.uncertaintyPct * 118}m-8,0h16`} stroke="#f2ede1" />
        <text x={110 + i * 137} y={104 - (p.errorPct + p.uncertaintyPct) * 59} textAnchor="middle" fill="#f2ede1">{p.errorPct.toFixed(2)} ± {p.uncertaintyPct.toFixed(2)}%</text>
        <text x={110 + i * 137} y="139" textAnchor="middle" fill="#bdcdd1">d = {p.d}</text>
      </g>)}
    </svg>
    <p>Four-round characterization · hybrid decoder using loss information · error bars: 1σ · no postselection</p>
  </div>;
}

function CameraRecord({ value }: { value: PaperControls['readState'] }) {
  return <div className="journey-camera-frame paper-camera" role="img" aria-label={`Illustrated camera result: ${value === 'lost' ? 'both positions empty, atom lost' : value === 'zero' ? 'atom in home position, 0' : 'atom in shifted position, 1'}`}>
    <div><i /> ILLUSTRATED CAMERA</div>
    <svg viewBox="0 0 200 128" aria-hidden="true">
      <defs><radialGradient id="paper-camera-spot"><stop stopColor="#ffffdf" /><stop offset="0.22" stopColor="#b5ecc6" /><stop offset="1" stopColor="#b5ecc6" stopOpacity="0" /></radialGradient></defs>
      <rect width="200" height="128" fill="#061016" />
      {[55, 145].map((x, i) => <g key={x}><rect x={x - 23} y="28" width="46" height="46" rx="3" stroke="#446570" fill="none" strokeDasharray="3 4" /><text x={x} y="95" textAnchor="middle" fill="#a1b7be">{i}</text>{value !== 'lost' && (value === 'zero' ? i === 0 : i === 1) && <circle cx={x} cy="51" r="24" fill="url(#paper-camera-spot)" />}</g>)}
    </svg>
    <p>{value === 'lost' ? 'Both empty → loss flag' : `Position → ${value === 'zero' ? '0' : '1'}`}</p>
  </div>;
}

export default function PaperJourney() {
  const [chapter, setChapter] = useState(getChapter);
  const [p, setP] = useState<PaperControls>(initial);
  const [playing, setPlaying] = useState(false);
  const [reset, setReset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stop = PAPER_STOPS[chapter]!;
  const pause = useCallback(() => setPlaying(false), []);
  function update(values: Partial<PaperControls>) { pause(); setP((old) => ({ ...old, ...values })); }
  const go = useCallback((n: number, manual = true) => {
    const i = Math.max(0, Math.min(PAPER_STOPS.length - 1, n));
    setChapter(i); window.location.hash = `/journey/${i}`;
    if (manual) { setPlaying(false); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }, []);

  useEffect(() => {
    document.title = 'Inside the Harvard–MIT quantum experiment · Nature, explained';
    window.scrollTo({ top: 0, behavior: 'instant' });
    const hash = () => setChapter(getChapter());
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false); };
    window.addEventListener('hashchange', hash); media.addEventListener('change', motion);
    return () => { window.removeEventListener('hashchange', hash); media.removeEventListener('change', motion); };
  }, []);
  useEffect(() => {
    const active = document.querySelector<HTMLElement>('.paper-journey .journey-chapters [aria-current="step"]');
    if (active?.parentElement) active.parentElement.scrollTo({ left: active.offsetLeft - active.parentElement.offsetLeft - 24 });
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (['INPUT', 'BUTTON', 'A', 'SUMMARY', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); go(chapter + (e.key === 'ArrowRight' ? 1 : -1)); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [chapter, go]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => chapter === PAPER_STOPS.length - 1 ? pause() : go(chapter + 1, false), 22000);
    return () => clearTimeout(timer);
  }, [chapter, playing, go, pause]);

  return <main className={`quantum-journey paper-journey chapter-${chapter}`}>
    <a className="journey-skip" href="#paper-experiment" onClick={(e) => { e.preventDefault(); document.getElementById(chapter === 0 ? 'paper-title' : 'paper-experiment')?.focus(); }}>Skip to the experiment</a>
    <header className="journey-header">
      <a className="journey-brand" href="#/journey/0"><span className="journey-mark" aria-hidden="true">◌</span><span>THE ATOM<span className="journey-brand-light"> COMPUTER</span></span></a>
      <span className="journey-edition">HARVARD–MIT · NATURE, EXPLAINED</span>
      <nav aria-label="Research and background"><a href="#/guide">Full paper guide ↗</a><a href="#/basics/0">Need the basics? ↗</a></nav>
    </header>
    <div className="journey-main">
      <section className="journey-story" key={chapter} aria-labelledby="paper-title">
        <p className="journey-eyebrow"><span>{String(chapter + 1).padStart(2, '0')}</span>{chapter === 0 ? 'HARVARD–MIT · NATURE 649 (2026)' : stop.question}</p>
        <h1 id="paper-title" tabIndex={-1}>{stop.title.map((line, i) => <span key={line}>{i === stop.title.length - 1 ? <em>{line}</em> : line}{i < stop.title.length - 1 && <br />}</span>)}</h1>
        <p className="journey-body">{stop.body}</p>
        {chapter === 0 ? <>
          <a className="paper-title-citation" href={PAPER_URL} target="_blank" rel="noreferrer">“A fault-tolerant neutral-atom architecture for universal quantum computation”<span>Bluvstein, Geim et al. · <em>Nature</em> 649, 39–46 (2026) ↗</span></a>
          <button className="journey-primary journey-enter" onClick={() => go(1)}>Explore the paper <Arrow /></button>
          <p className="journey-invitation">From the optical table<br />to the paper’s central results.</p>
          <div className="paper-headlines"><a href={`${PAPER_URL}#Fig1`}><strong>{PAPER.atoms}</strong><span>atoms, at most</span></a><a href={`${PAPER_URL}#Fig2`}><strong>{PAPER.qec.belowThreshold}×</strong><span>error suppression</span></a><a href={`${PAPER_URL}#Fig6`}><strong>{PAPER.deep.layers}</strong><span>layers demonstrated</span></a></div>
          <p className="paper-headline-note">Separate experiments and code configurations. The tour explains what each number means.</p>
        </> : <p className="journey-takeaway"><span aria-hidden="true">↳</span>{stop.takeaway}</p>}
      </section>

      <section className="journey-stage" aria-label={`3D explanation of the paper: ${stop.short}`}>
        <div className="journey-stage-top"><span><i /> LIVE 3D</span><span>DRAG TO EXPLORE</span><button onClick={() => { setReset((n) => n + 1); pause(); }} aria-label="Reset camera view">↺</button></div>
        <div className="journey-canvas"><Suspense fallback={<div className="journey-loading"><span />Preparing the experiment…</div>}><Scene chapter={chapter} controls={p} reducedMotion={reducedMotion} reset={reset} onInteract={pause} /></Suspense></div>
        {chapter === 2 && p.readStep === 2 && <CameraRecord value={p.readState} />}
        <div className="journey-scene-caption"><span>{stop.figure.toUpperCase()}</span><p>{stop.model}</p></div>
      </section>

      {chapter > 0 && <section className="journey-experiment paper-experiment" id="paper-experiment" tabIndex={-1} aria-label="Explore the paper’s mechanism">
        <div className="journey-experiment-heading"><span className="journey-small-label">EXPLORE THE MECHANISM</span><a className="paper-figure-link" href={`${PAPER_URL}#Fig${stop.figures[0]}`} target="_blank" rel="noreferrer">Fig. {stop.figures.join(' + ')} ↗</a></div>
        {chapter === 1 && <><Steps values={['Storage', 'Entangle', 'Readout']} current={p.zone} set={(zone) => update({ zone })} /><p className="journey-control-note">{['Keep a block’s quantum information coherent while other parts of the machine work.', 'Bring blocks together so the Rydberg light can perform parallel gates.', 'Convert states to positions and image them. A shielding beam protects stored data; spare atoms come from the reservoir.'][p.zone]}</p></>}
        {chapter === 2 && <>
          <div className="paper-choice" aria-label="Choose the atom’s starting condition">{(['zero', 'one', 'lost'] as const).map((s) => <button key={s} aria-pressed={p.readState === s} onClick={() => update({ readState: s })}>{s === 'zero' ? 'State 0' : s === 'one' ? 'State 1' : 'Atom lost'}</button>)}</div>
          <Steps values={['Map states', 'Separate', 'Image']} current={p.readStep} set={(readStep) => update({ readStep })} />
          <p className="paper-readout-result" aria-live="polite">{p.readStep < 2 ? ['Map the clock states to states that respond differently to the light.', 'A state-selective lattice holds one state while a tweezer moves the other.'][p.readStep] : p.readState === 'lost' ? 'Both positions empty: flag loss, rather than inventing a 0.' : `Atom at the ${p.readState === 'zero' ? 'home' : 'shifted'} position: record ${p.readState === 'zero' ? '0' : '1'} and retain the atom.`}</p>
          <div className="paper-two-facts"><span><strong>{PAPER.lattice.bitFlipPct} ± {PAPER.lattice.bitFlipUnc}%</strong>reported bit-flip error</span><span><strong>{PAPER.lattice.lossPct} ± {PAPER.lattice.lossUnc}%</strong>reported atom loss</span></div>
        </>}
        {chapter === 3 && <>
          <div className="journey-toggle"><button aria-pressed={p.distance === 3} onClick={() => update({ distance: 3 })}>Smaller code<span>Distance 3</span></button><button aria-pressed={p.distance === 5} onClick={() => update({ distance: 5 })}>Larger code<span>Distance 5</span></button></div>
          <MeasuredChart distance={p.distance} />
        </>}
        {chapter === 4 && <>
          <div className="journey-toggle"><button aria-pressed={p.gateMode === 'transversal'} onClick={() => update({ gateMode: 'transversal', gateStep: 0 })}>Transversal<span>Pair the data atoms</span></button><button aria-pressed={p.gateMode === 'surgery'} onClick={() => update({ gateMode: 'surgery', gateStep: 0 })}>Lattice surgery<span>Measure a joint boundary</span></button></div>
          <Steps values={p.gateMode === 'transversal' ? ['Separate', 'Pair atoms', 'Gate pulse'] : ['Separate', 'Add seam', 'Measure']} current={p.gateStep} set={(gateStep) => update({ gateStep })} />
          <p className="journey-control-note">{p.gateMode === 'transversal' ? 'Pairwise physical gates, with the required single-qubit rotations, implement the logical gate. Later checks diagnose the errors.' : 'Ancilla measurements establish a joint logical parity. Their reliability is part of the gate’s reliability.'}</p>
        </>}
        {chapter === 5 && <>
          <Steps values={['Prepare', 'Entangle', 'Measure', 'Track result']} current={p.universalStep} set={(universalStep) => update({ universalStep })} />
          <p className="journey-control-note">{['Prepare entangled Reed–Muller blocks in logical resource states. This code supports a transversal T operation.', 'Logical CZ operations connect the resource blocks. Each block represents encoded information, not a single bare atom.', 'X-basis measurements teleport the logical information while implementing H. The measurement outcome affects the output branch.', 'Interpret the branch using the measurement record. In this experiment, feedforward was applied in software; this is not a live adaptive controller.'][p.universalStep]}</p>
          <div className="paper-gate-alphabet"><span><b>T</b>protected 45° turn</span><span><b>H</b>via teleportation</span><span><b>CZ</b>entangle blocks</span></div>
        </>}
        {chapter === 6 && <>
          <div className="paper-cycle-label"><span>ILLUSTRATED LAYER</span><output>{p.cycle} / {PAPER.deep.layers}</output></div>
          <Steps values={['Encode', 'Entangle', 'Read & store', 'Reset']} current={p.cycleStep} set={(cycleStep) => update({ cycleStep })} />
          <p className="journey-control-note">{['Fresh atoms are encoded into logical blocks. The other group carries information from the previous layer.', 'A transversal interaction connects the old and fresh groups, forming links across layers of the computation.', 'Read the old group and store the new group. The measurement record is used to interpret the teleported logical state.', 'Cool the measured atoms, replace losses from the reservoir, and initialize them for reuse. They become the fresh group next time.'][p.cycleStep]}</p>
          <div className="journey-measure-row"><button className="journey-primary" disabled={p.cycleStep < 3 || p.cycle >= PAPER.deep.layers} onClick={() => update({ cycle: p.cycle + 1, cycleStep: 0 })}>Next layer · swap groups <Arrow /></button><button className="journey-secondary" onClick={() => update({ cycle: 1, cycleStep: 0 })} aria-label="Restart illustrated layers">↺</button></div>
        </>}

        <div className="paper-finding"><span>WHAT THE PAPER {chapter === 1 ? 'BUILT' : 'FOUND'}</span><p>{stop.result}</p></div>
        <details className="journey-physics" key={chapter} onToggle={pause}>
          <summary>Evidence & important limits <span>+</span></summary>
          {chapter === 1 && <p>The qubits are {PAPER.species} hyperfine clock states. The SLM and AOD use {PAPER.slm.wavelengthNm} nm trapping light; Raman light drives single-qubit gates, and {PAPER.rydberg.blueNm} + {PAPER.rydberg.irNm} nm light implements Rydberg gates. These capabilities existed before this paper; the architectural experiments are the focus here.</p>}
          {chapter === 2 && <p>Methods: a {PAPER.lattice.wavelengthNm} nm state-selective lattice and AOD motion separate the spin states by approximately {PAPER.lattice.splitUm} μm in {PAPER.lattice.splitUs} μs. Imaging uses {PAPER.lattice.pumpNm} nm light. Retaining atoms enables reuse; recognizing loss gives the decoder an erasure location. The position-to-record graphic is explanatory.</p>}
          {chapter === 3 && <><p>The plotted values are stated in Fig. 2d and Methods, using the hybrid of machine learning and delayed-erasure maximum-likelihood decoding. The reported suppression factor is {PAPER.qec.belowThreshold} ± {PAPER.qec.belowThresholdUnc}; it describes this code-size comparison and circuit, not an arbitrary algorithm’s speed or fidelity.</p><p>The separate {PAPER.qec.lossMlGain}× improvement from loss information and machine learning is a different comparison, against bare MLE. We do not conflate the two results or extrapolate to longer circuits.</p></>}
          {chapter === 4 && <p>Fig. 3 compares specific protocols and decoding choices. Lattice surgery here used {PAPER.logic.surgeryRounds} stabilizer rounds, fewer than d = 5, with additional error detection. The optimum near {PAPER.logic.optimalCnotsPerRound} transversal CNOTs per round is most apparent with modest postselection. This does not establish a universal ranking for every architecture.</p>}
          {chapter === 5 && <p>Fig. 4 uses {PAPER.codes.reedMuller} Reed–Muller codes. Its extra robustness at 45° requires the correct in-block entanglement and stabilizer signs. The synthesis experiments reach up to {PAPER.codes.tGatesShown} T gates; measured angles are in Fig. 4c–d. We show the mechanism rather than invented tomography points. Different acceptance fractions are used in those panels.</p>}
          {chapter === 6 && <><p>Fig. 5 demonstrates recovery of filling and temperature. Fig. 6 tests logical and physical-error correlations: logical correlations persist while physical-error correlations decay. Flat stabilizer expectations indicate steady internal entropy; they do not imply constant logical fidelity.</p><p>Some Fig. 6 results use confidence postselection; circuits stop as the atom reservoir is depleted. The {PAPER.codes.maxLogicals}-logical-qubit result uses {PAPER.codes.tesseract} blocks, while the 27-layer Steane demonstration uses {PAPER.codes.steane} blocks. Logical feedforward was handled in software.</p><p>The paper demonstrates architectural building blocks and limited circuits. Lower physical error rates, scalable decoding, and continuous reservoir refill remain challenges for large-scale computation.</p></>}
          <a href={stop.anchor}>Open the detailed explanation ↗</a><a href={`${PAPER_URL}#Fig${stop.figures[0]}`} target="_blank" rel="noreferrer">Read {stop.figure} in the paper ↗</a>
        </details>
      </section>}
    </div>

    <footer className="journey-footer">
      <div className="journey-transport"><div className="journey-transport-label"><span className="journey-small-label">THE PAPER, STEP BY STEP</span><span>{String(chapter + 1).padStart(2, '0')} / 07</span></div><div className="journey-play-controls"><button aria-label={playing ? 'Pause guided tour' : 'Play guided tour'} onClick={() => { if (chapter === PAPER_STOPS.length - 1 && !playing) go(0, false); setPlaying(!playing); }}>{playing ? 'Ⅱ' : '▷'} <span>{playing ? 'Pause tour' : 'Play tour'}</span></button><button disabled={chapter === 0} aria-label="Previous chapter" onClick={() => go(chapter - 1)}><Arrow back /></button>{chapter < PAPER_STOPS.length - 1 ? <button aria-label="Next chapter" onClick={() => go(chapter + 1)}><Arrow /></button> : <a href="#outlook" className="journey-finish">What remains <Arrow /></a>}</div></div>
      <nav className="journey-chapters" aria-label="Paper chapters">{PAPER_STOPS.map((s, i) => <button key={s.short} aria-current={i === chapter ? 'step' : undefined} data-complete={i < chapter} onClick={() => go(i)}><span className="journey-track"><i /></span><span className="journey-chapter-name"><small>{String(i + 1).padStart(2, '0')}</small>{s.short}</span></button>)}</nav>
      <div className="journey-colophon"><span>Explaining <a href={PAPER_URL}>Bluvstein, Geim et al. · <em>Nature</em> 649, 39–46 (2026) ↗</a></span><span>Independent explainer · Published evidence, illustrated mechanisms · Luke McEvoy</span></div>
    </footer>
  </main>;
}
