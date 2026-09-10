import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { PAPER } from '../data/paper.ts';
import { bitFlipSyndrome, interferenceState, locateBitFlip, samplePair, teachingPair } from '../physics/journey.ts';
import { p1FromTheta } from '../physics/qubit.ts';
import { probabilities } from '../physics/twoqubit.ts';
import './journey.css';

const Scene = lazy(() => import('./JourneyScene.tsx'));
const DOI = `https://doi.org/${PAPER.doi}`;
const CHAPTERS = [
  {
    short: 'The machine', eyebrow: 'A journey beneath the surface',
    title: <>A computer.<br />{'Made of light'}<br />and <em>atoms.</em></>,
    body: 'Inside this machine, individual atoms hold information. Light holds the atoms, changes their states, and makes them interact. Come closer. You can operate it yourself.',
    takeaway: 'Start with something real. Then discover what makes it quantum.',
    scene: '01 / THE APPARATUS', model: 'An artistic cutaway of the optical controls. Layout and scale are illustrative; the atom array is enlarged.',
    deeper: '#control',
  },
  {
    short: 'Hold an atom', eyebrow: 'First, build somewhere to keep a bit',
    title: <>Hold an atom.<br /><em>With light.</em></>,
    body: 'A tightly focused laser makes a tiny trap. A cooled atom stays near its centre, suspended in vacuum. Make many traps, and you have a register of atoms to work with.',
    takeaway: 'Move the pockets of light. The trapped atoms follow.',
    scene: '02 / OPTICAL TWEEZERS', model: 'False-colour traps; atoms enlarged for visibility. The infrared trapping light is invisible to your eyes.',
    deeper: '#/foundations/light-and-atoms/tweezer',
  },
  {
    short: 'Write a qubit', eyebrow: 'Information lives in the atom’s internal state',
    title: <>A different<br /><em>kind of bit.</em></>,
    body: 'Call two internal states of the atom 0 and 1. A light pulse can create a superposition, with a wave-like weight (an amplitude) for each answer. These weights determine the chances of measuring 0 or 1.',
    takeaway: 'Turn the pulse. Watch the chances of 0 and 1 change.',
    scene: '03 / ONE ATOM’S STATE', model: 'This sphere is a map of a quantum state, not the atom’s shape or a spinning electron.',
    deeper: '#/foundations/qubit',
  },
  {
    short: 'Make waves', eyebrow: 'This is what makes quantum logic different',
    title: <>Possibilities<br />can <em>cancel.</em></>,
    body: 'Amplitudes behave like waves. A gate can combine them so they reinforce or cancel. Quantum algorithms arrange this interference to make useful answers more likely.',
    takeaway: 'Shift one wave. The same starting chances can lead to a different answer.',
    scene: '04 / INTERFERENCE', model: 'The curves represent probability amplitudes, not moving atoms or visible light waves. The output chances are calculated.',
    deeper: '#/foundations/qubit',
  },
  {
    short: 'Entangle', eyebrow: 'From individual states to a shared state',
    title: <>Two atoms.<br /><em>One joint state.</em></>,
    body: 'Briefly excite nearby atoms and their interaction changes how a laser pulse acts on the pair. Combined with single-atom gates, this can make an entangled state: the pair has a description that cannot be split into two independent states.',
    takeaway: 'Switch the entangling gate off and compare the possible answers.',
    scene: '05 / THE ENTANGLING GATE', model: 'Expanded shells suggest the Rydberg interaction during a pulse; they are not a bond. The circuit below is an ideal teaching example.',
    deeper: '#/foundations/entanglement/gates',
  },
  {
    short: 'Read the answer', eyebrow: 'The quantum state becomes a classical record',
    title: <>Let the atoms<br /><em>tell you.</em></>,
    body: 'The experiment moves atoms to different positions depending on their state, then takes a picture. Position reveals 0 or 1. Here, each click prepares a fresh pair and reads it once.',
    takeaway: 'An entangled pair can give random individual answers with a predictable relationship.',
    scene: '06 / SPIN TO POSITION', model: 'Ideal Born-rule samples, not experimental data. The view jumps to the final readout positions; experimental errors and losses are omitted.',
    deeper: '#readout',
  },
  {
    short: 'Protect it', eyebrow: 'The engineering challenge: fragile information',
    title: <>Check the pattern.<br /><em>Keep the secret.</em></>,
    body: 'To protect a quantum state, spread its information across a group. Measure relationships between atoms to find errors, without asking each atom for the answer the computation is preserving.',
    takeaway: 'Flip one atom. The two relationship checks reveal which one needs fixing.',
    scene: '07 / ERROR CORRECTION', model: 'A three-qubit repetition-code example: at most one bit flip, perfect checks. It cannot correct phase errors. The paper uses richer quantum codes.',
    deeper: '#/foundations/error-correction',
  },
] as const;

function initialChapter() {
  const value = Number(window.location.hash.split('/')[2] ?? 0);
  return Number.isInteger(value) ? Math.max(0, Math.min(CHAPTERS.length - 1, value)) : 0;
}

function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" style={back ? { transform: 'rotate(180deg)' } : undefined}>
    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
  </svg>;
}

function ProbabilityBars({ values, labels }: { values: readonly number[]; labels: string[] }) {
  return <div className="journey-probabilities" aria-label="Calculated outcome probabilities">
    {values.map((value, i) => <div className="journey-probability" key={labels[i]}>
      <span>{labels[i]}</span><div className="journey-probability-track"><i style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} /></div>
      <output>{(value * 100).toFixed(0)}<small>%</small></output>
    </div>)}
  </div>;
}

function CameraFrame({ outcome }: { outcome: number | null }) {
  return <div className="journey-camera-frame" aria-label={outcome === null ? 'Simulated camera waiting for a measurement' : `Simulated camera frame: atom A ${outcome >> 1}, atom B ${outcome & 1}`}>
    <div><i /> SIMULATED CAMERA</div>
    <svg viewBox="0 0 200 142" aria-hidden="true">
      <defs>
        <pattern id="sensor-pixels" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M6 0H0V6" fill="none" stroke="#40545b" strokeWidth="0.4" opacity="0.5" /></pattern>
        <radialGradient id="sensor-spot"><stop stopColor="#fffce4" /><stop offset="0.14" stopColor="#d9f4cb" /><stop offset="0.35" stopColor="#88d5ae" stopOpacity="0.7" /><stop offset="1" stopColor="#88d5ae" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="142" fill="#081016" />
      <rect x="0" y="0" width="200" height="142" fill="url(#sensor-pixels)" />
      {[54, 140].map((x, atom) => <g key={x}>
        <text x={x} y="17" fill="#85a6b1" textAnchor="middle">{atom === 0 ? 'A' : 'B'}</text>
        {[47, 108].map((y, bit) => <g key={y}>
          <rect x={x - 16} y={y - 16} width="32" height="32" rx="3" fill="none" stroke="#39535d" strokeDasharray="2 3" />
          <text x={x + 25} y={y + 4} fill="#76929e">{bit}</text>
          {outcome !== null && (atom === 0 ? outcome >> 1 : outcome & 1) === bit && <circle cx={x} cy={y} r="22" fill="url(#sensor-spot)" />}
        </g>)}
      </g>)}
    </svg>
    <p>{outcome === null ? 'Awaiting a fresh pair' : 'Two positions → two classical bits'}</p>
  </div>;
}

export default function QuantumJourney() {
  const [chapter, setChapter] = useState(initialChapter);
  const [angle, setAngle] = useState(90);
  const [phase, setPhase] = useState(0);
  const [spacing, setSpacing] = useState(1.6);
  const [entangled, setEntangled] = useState(true);
  const [outcome, setOutcome] = useState<number | null>(null);
  const [shots, setShots] = useState<number[]>([]);
  const [error, setError] = useState<number | null>(null);
  const [corrected, setCorrected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reset, setReset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const c = CHAPTERS[chapter]!;
  const pair = useMemo(() => teachingPair(entangled), [entangled]);
  const pairP = probabilities(pair);
  const interferenceP = probabilities(interferenceState(phase * Math.PI / 180));
  const p1 = p1FromTheta(angle * Math.PI / 180);
  const syndrome = bitFlipSyndrome(error);
  const diagnosed = locateBitFlip(syndrome);

  const go = useCallback((next: number, manual = true) => {
    const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, next));
    if (manual) setPlaying(false);
    window.location.hash = `/basics/${clamped}`;
    setChapter(clamped);
    if (manual) window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const pause = useCallback(() => setPlaying(false), []);

  useEffect(() => {
    document.title = 'Inside a quantum computer · An interactive journey';
    window.scrollTo({ top: 0, behavior: 'instant' });
    const onHash = () => setChapter(initialChapter());
    window.addEventListener('hashchange', onHash);
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => { setReducedMotion(query.matches); if (query.matches) setPlaying(false); };
    query.addEventListener('change', onMotion);
    return () => { window.removeEventListener('hashchange', onHash); query.removeEventListener('change', onMotion); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (chapter === CHAPTERS.length - 1) setPlaying(false);
      else go(chapter + 1, false);
    }, 16000);
    return () => clearTimeout(timer);
  }, [chapter, playing, go]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'SUMMARY', 'A'].includes(event.target.tagName) || event.target.isContentEditable)) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); go(chapter + (event.key === 'ArrowRight' ? 1 : -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chapter, go]);
  useEffect(() => {
    const current = document.querySelector<HTMLElement>('.journey-chapters [aria-current="step"]');
    const nav = current?.parentElement;
    if (nav && current) nav.scrollTo({ left: current.offsetLeft - nav.offsetLeft - 24, behavior: 'instant' });
  }, [chapter]);

  function setGate(value: boolean) { pause(); setEntangled(value); setShots([]); setOutcome(null); }
  function measure(count: number) {
    pause();
    const results = Array.from({ length: count }, () => samplePair(pair, Math.random()));
    setShots((old) => [...old, ...results]);
    setOutcome(results.at(-1)!);
  }

  return <main className={`quantum-journey chapter-${chapter}`}>
    <a className="journey-skip" href="#journey-experiment" onClick={(event) => { event.preventDefault(); document.getElementById(chapter === 0 ? 'journey-title' : 'journey-experiment')?.focus(); }}>Skip to the experiment</a>
    <header className="journey-header">
      <a className="journey-brand" href="#/basics/0" aria-label="Inside quantum, start the journey">
        <span className="journey-mark" aria-hidden="true">◌</span><span>INSIDE<span className="journey-brand-light"> QUANTUM</span></span>
      </a>
      <span className="journey-edition">A MACHINE YOU CAN UNDERSTAND</span>
      <nav aria-label="Explore the research"><a href="#/journey/0">The Harvard paper <span>↗</span></a><a href="#/foundations">Go deeper <span>↗</span></a></nav>
    </header>

    <div className="journey-main">
      <section className="journey-story" key={chapter} aria-labelledby="journey-title">
        <p className="journey-eyebrow"><span>{String(chapter + 1).padStart(2, '0')}</span> {c.eyebrow}</p>
        <h1 id="journey-title" tabIndex={-1}>{c.title}</h1>
        <p className="journey-body">{c.body}</p>
        {chapter === 0 ? <>
          <button className="journey-primary journey-enter" onClick={() => go(1)}>Step inside <Arrow /></button>
          <p className="journey-invitation">No physics background needed.<br />Just bring your curiosity.</p>
          <a className="journey-paper-stat" href={DOI} target="_blank" rel="noreferrer"><strong>{PAPER.atoms}</strong><span>atoms at most in the published experiment<br />Harvard, MIT & collaborators · <em>Nature</em> ↗</span></a>
        </> : <p className="journey-takeaway"><span aria-hidden="true">↳</span>{c.takeaway}</p>}
      </section>

      <section className="journey-stage" aria-label={`Interactive 3D illustration: ${c.short}`}>
        <div className="journey-stage-top"><span><i /> LIVE 3D</span><span>DRAG TO EXPLORE</span><button onClick={() => { setReset((r) => r + 1); pause(); }} aria-label="Reset camera view">↺</button></div>
        <div className="journey-canvas">
          <Suspense fallback={<div className="journey-loading"><span />Preparing the light…</div>}>
            <Scene chapter={chapter} angle={angle * Math.PI / 180} phase={phase * Math.PI / 180} spacing={spacing} entangled={entangled} outcome={outcome} error={error} reducedMotion={reducedMotion} reset={reset} onInteract={pause} />
          </Suspense>
        </div>
        {chapter === 5 && <CameraFrame outcome={outcome} />}
        <div className="journey-scene-caption"><span>{c.scene}</span><p>{c.model}</p></div>
      </section>

      {chapter > 0 && <section id="journey-experiment" tabIndex={-1} className="journey-experiment" aria-label="Try the experiment">
        <div className="journey-experiment-heading"><span className="journey-small-label">YOUR TURN</span><span className="journey-live-dot">{chapter === 5 ? 'SIMULATED MEASUREMENTS' : 'LIVE EXPERIMENT'}</span></div>
        {chapter === 1 && <>
          <label className="journey-slider-label" htmlFor="trap-spacing">Move the light traps <span>{spacing < 1.4 ? 'Together' : spacing > 1.8 ? 'Apart' : 'In between'}</span></label>
          <input id="trap-spacing" type="range" min="0.8" max="2.3" step="0.01" value={spacing} onChange={(e) => { setSpacing(+e.target.value); pause(); }} />
          <div className="journey-range-ends"><span>Bring together</span><span>Spread apart</span></div>
          <p className="journey-control-note">In the lab, steering the laser beams moves the atoms. No tiny mechanical tweezers required.</p>
        </>}
        {chapter === 2 && <>
          <label className="journey-slider-label" htmlFor="pulse-angle">Turn the light pulse <output>{angle}°</output></label>
          <input id="pulse-angle" type="range" min="0" max="180" step="1" value={angle} onChange={(e) => { setAngle(+e.target.value); pause(); }} />
          <div className="journey-range-ends"><span>Definitely 0</span><span>Definitely 1</span></div>
          <ProbabilityBars values={[1 - p1, p1]} labels={['0', '1']} />
          <p className="journey-control-note">Chances if you measure now. The pointer shows the state before measurement.</p>
        </>}
        {chapter === 3 && <>
          <label className="journey-slider-label" htmlFor="wave-phase">Shift the second wave <output>{phase}°</output></label>
          <input id="wave-phase" type="range" min="0" max="360" step="1" value={phase} onChange={(e) => { setPhase(+e.target.value); pause(); }} />
          <div className="journey-range-ends"><span>Reinforce</span><span>Cancel</span><span>Reinforce</span></div>
          <ProbabilityBars values={[interferenceP[0], interferenceP[2]]} labels={['0', '1']} />
          <p className="journey-control-note">The lower wave adds the two amplitudes for answer 0. When they cancel, answer 1 becomes certain.</p>
        </>}
        {chapter === 4 && <>
          <div className="journey-toggle" aria-label="Entangling gate">
            <button aria-pressed={entangled} onClick={() => setGate(true)}>Gate on <span>Entangled</span></button>
            <button aria-pressed={!entangled} onClick={() => setGate(false)}>Gate off <span>Independent</span></button>
          </div>
          <ProbabilityBars values={pairP} labels={['00', '01', '10', '11']} />
          <p className="journey-control-note">Calculated joint outcomes after the full circuit. Shared outcomes alone do not prove entanglement; <a href="#/foundations/entanglement">test other measurement directions ↗</a>.</p>
        </>}
        {chapter === 5 && <>
          <div className="journey-measure-row"><button className="journey-primary" onClick={() => measure(1)}>Prepare & measure <span>↗</span></button><button className="journey-secondary" onClick={() => measure(20)}>Run 20</button></div>
          <div className="journey-shot-strip" aria-label="Most recent measurement results">{shots.length === 0 ? <span>The camera is ready. Take your first reading.</span> : shots.slice(-12).map((s, i) => <span className="journey-shot" key={`${shots.length - 12 + i}`}>{s.toString(2).padStart(2, '0')}</span>)}</div>
          <p className="journey-shot-summary" aria-live="polite">{shots.length} preparations · {entangled ? 'Entangling gate on' : 'Entangling gate off'}{shots.length > 0 && ` · ${shots.filter((s) => s === 0 || s === 3).length} matching pairs`}</p>
          <div className="journey-inline-actions"><button onClick={() => setGate(!entangled)}>Turn gate {entangled ? 'off' : 'on'} & reset</button><button onClick={() => { setShots([]); setOutcome(null); pause(); }}>Clear readings</button></div>
          <p className="journey-control-note">{entangled ? 'Each atom’s result is unpredictable. Entanglement cannot send a message faster than light.' : 'Atom A can give 0 or 1. Atom B stays in 0. The gate changed which joint answers are possible.'}</p>
        </>}
        {chapter === 6 && <>
          <div className="journey-errors">{[0, 1, 2].map((i) => <button key={i} aria-pressed={error === i} onClick={() => { setError(error === i ? null : i); setCorrected(false); pause(); }}>Flip {String.fromCharCode(65 + i)}</button>)}<button className="journey-repair" disabled={error === null} onClick={() => { if (diagnosed === error) { setError(null); setCorrected(true); } pause(); }}>Repair <span>↺</span></button></div>
          <div className="journey-syndromes"><span>A ↔ B <b data-error={syndrome[0] < 0}>{syndrome[0] < 0 ? 'Different' : 'Same'}</b></span><span>B ↔ C <b data-error={syndrome[1] < 0}>{syndrome[1] < 0 ? 'Different' : 'Same'}</b></span></div>
          <p className="journey-control-note" aria-live="polite">{corrected ? 'Pattern restored. The encoded quantum information is preserved in this ideal model.' : diagnosed !== null ? `These checks point to atom ${String.fromCharCode(65 + diagnosed)}. We learned where the flip was without reading the logical answer.` : 'Both checks agree. Now introduce one bit flip and see how the pattern changes.'}</p>
        </>}
        <details className="journey-physics" onToggle={pause} key={chapter}>
          <summary>Show the physics <span>+</span></summary>
          {chapter === 1 && <p>Optical dipole trapping: the intensity gradient confines a cooled atom near a focus. The paper uses {PAPER.slm.wavelengthNm} nm light. Spacing here is illustrative, not a calibrated motion simulation.</p>}
          {chapter === 2 && <><p>Ideal resonant rotation from |0⟩:</p><code>|ψ⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩<br />P(1) = sin²({angle}°/2) = {p1.toFixed(4)}</code><p>The pulse phase selects the rotation axis; this example uses a real rotation about y.</p></>}
          {chapter === 3 && <><p>Ideal circuit: H → phase(φ) → H, starting at |0⟩.</p><code>A₀ = (1 + exp(iφ))/2<br />P(0) = |A₀|² = cos²(φ/2)<br />P(0) = {interferenceP[0].toFixed(4)}</code><p>The phase changes amplitudes without changing the intermediate populations. The final H converts that phase to an observable difference.</p></>}
          {(chapter === 4 || chapter === 5) && <><p>Starting at |00⟩, apply H to both atoms, {entangled ? 'CZ' : 'bypass CZ'}, then H to B.</p><code>{entangled ? '|ψ⟩ = (|00⟩ + |11⟩)/√2' : '|ψ⟩ = (|00⟩ + |10⟩)/√2'}<br />P(00, 01, 10, 11) = [{pairP.map((p) => p.toFixed(2)).join(', ')}]</code><p>CZ changes the sign of the |11⟩ amplitude. The paper’s physical gate uses {PAPER.rydberg.blueNm} + {PAPER.rydberg.irNm} nm light and lasts {PAPER.rydberg.gateNs} ns. This ideal circuit does not simulate that pulse shape.</p></>}
          {chapter === 6 && <><code>α|000⟩ + β|111⟩<br />Checks: Z₀Z₁, Z₁Z₂<br />Syndrome: ({syndrome.map((s) => s > 0 ? '+1' : '−1').join(', ')})</code><p>Both codewords give identical check outcomes, so these measurements do not distinguish α from β. A single X error changes a unique pair of signs. This code alone does not protect against Z errors.</p></>}
          <a href={c.deeper}>Explore this mechanism in the full guide <span>↗</span></a><a href={DOI} target="_blank" rel="noreferrer">Published experiment <span>↗</span></a>
        </details>
      </section>}
    </div>

    <footer className="journey-footer">
      <div className="journey-transport">
        <div className="journey-transport-label"><span className="journey-small-label">THE JOURNEY</span><span>{String(chapter + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}</span></div>
        <div className="journey-play-controls"><button onClick={() => { if (chapter === CHAPTERS.length - 1 && !playing) go(0, false); setPlaying(!playing); }} aria-label={playing ? 'Pause guided tour' : 'Play guided tour'}>{playing ? 'Ⅱ' : '▷'} <span>{playing ? 'Pause tour' : 'Play tour'}</span></button><button disabled={chapter === 0} onClick={() => go(chapter - 1)} aria-label="Previous chapter"><Arrow back /></button>{chapter < CHAPTERS.length - 1 ? <button onClick={() => go(chapter + 1)} aria-label="Next chapter"><Arrow /></button> : <a href="#/guide" className="journey-finish">Full guide <Arrow /></a>}</div>
      </div>
      <nav className="journey-chapters" aria-label="Journey chapters">{CHAPTERS.map((ch, i) => <button key={ch.short} aria-current={chapter === i ? 'step' : undefined} data-complete={i < chapter} onClick={() => go(i)}><span className="journey-track"><i /></span><span className="journey-chapter-name"><small>{String(i + 1).padStart(2, '0')}</small>{ch.short}</span></button>)}</nav>
      <div className="journey-colophon"><span>An independent, interactive companion to <a href={DOI}>Bluvstein, Geim et al. · <em>Nature</em> (2026) ↗</a></span><span>Illustrated hardware · Calculated quantum states · By Luke McEvoy</span></div>
    </footer>
  </main>;
}
