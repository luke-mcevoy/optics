import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import { BlochExplorer } from '../viz/foundations/BlochExplorer.tsx';
import { PureVsMixed } from '../viz/foundations/PureVsMixed.tsx';
import { RabiDetuned } from '../viz/foundations/RabiDetuned.tsx';
import { RamseyFringes } from '../viz/foundations/RamseyFringes.tsx';
import type { FoundationSection } from './registry.tsx';

export const QUBIT_SECTIONS: readonly FoundationSection[] = [
  {
    id: 'sphere',
    title: 'Two levels and a direction',
    kicker: 'A bit is a switch. A qubit is an arrow — and the arrow’s direction is the whole story.',
    body: (
      <>
        <Plain>
          <p>
            Take any object that has exactly two stable conditions you can tell apart and cannot
            accidentally leave — two energy levels of an atom, say. That is the hardware of a
            qubit. What makes it <em>quantum</em> is that the object is not restricted to
            being in one condition or the other. It can be in a definite state that is a blend
            of both, with a definite &ldquo;angle&rdquo; between them, and that angle carries
            information a switch cannot.
          </p>
          <p>
            The picture everyone uses is a globe. |0⟩ is the north pole, |1⟩ the south, and every
            other point on the surface is a legitimate state. Latitude says how likely you are to
            find |0⟩ versus |1⟩ when you look. Longitude — the <em>phase</em> — is invisible when
            you look, but it decides what the next operation does. Looking forces the arrow to a
            pole; that is measurement, and it is irreversible.
          </p>
        </Plain>
        <Primer>
          <p>
            A pure state is a unit vector in a two-dimensional complex space, |ψ⟩ = α|0⟩ + β|1⟩
            with |α|² + |β|² = 1. Removing the unobservable overall phase leaves two real
            parameters, conventionally
          </p>
          <Eq label="Bloch parametrisation; θ ∈ [0, π], φ ∈ [0, 2π)">
            |ψ⟩ = cos(θ/2) |0⟩ + e<sup>iφ</sup> sin(θ/2) |1⟩
          </Eq>
          <p>
            which is a point on the unit sphere with Bloch vector r = (sin θ cos φ, sin θ sin φ,
            cos θ). The components are expectation values, r = (⟨σ<sub>x</sub>⟩, ⟨σ<sub>y</sub>⟩,
            ⟨σ<sub>z</sub>⟩). A measurement in the 0/1 basis returns |1⟩ with probability
            sin²(θ/2) = (1 − r<sub>z</sub>)/2 and leaves the state at the corresponding pole.
            Orthogonal states are antipodal, not perpendicular: the sphere is a picture of a
            two-dimensional Hilbert space, not of ordinary space.
          </p>
        </Primer>
        <BlochExplorer />
      </>
    ),
  },
  {
    id: 'pure-mixed',
    title: 'Superposition is not ignorance',
    kicker: 'Half-and-half can mean two very different things. Only one of them computes.',
    body: (
      <>
        <Plain>
          <p>
            &ldquo;The qubit is 50% zero and 50% one&rdquo; describes two situations that look
            identical if you just read it out, and behave completely differently otherwise. In
            one, the qubit really is at a definite point on the equator — you simply do not know
            which pole a look will give. In the other, the qubit is secretly at the north pole or
            the south pole and you have lost track of which. Tilt the measurement — ask
            &ldquo;which way along the equator?&rdquo; instead of &ldquo;which pole?&rdquo; — and
            the first case answers with certainty while the second is still a coin toss.
          </p>
          <p>
            Every operation a quantum computer performs relies on the first kind of half-and-half.
            &ldquo;Decoherence&rdquo; is the name for the environment quietly turning the first
            kind into the second — nudging the phase until it is random — and every trick in the
            main guide, from the choice of clock states to error correction, is a defence against
            it.
          </p>
        </Plain>
        <Primer>
          <p>
            A state about which we have only probabilistic knowledge is a density operator ρ =
            Σ p<sub>k</sub> |ψ<sub>k</sub>⟩⟨ψ<sub>k</sub>|, with Bloch vector the probability-weighted
            average of the components&rsquo; vectors — which in general lies <em>inside</em> the
            sphere. Purity Tr ρ² = (1 + |r|²)/2 is 1 on the surface and 1/2 at the centre. The
            equal mixture of |0⟩ and |1⟩ sits at the centre and gives 50/50 along every axis;
            |+⟩ sits on the surface and gives 50/50 only along z. Dephasing shrinks the
            transverse components r<sub>x</sub>, r<sub>y</sub> toward zero with a time constant
            T<sub>2</sub>; relaxation drives r<sub>z</sub> toward its thermal value with T<sub>1</sub>.
          </p>
        </Primer>
        <PureVsMixed />
      </>
    ),
  },
  {
    id: 'rabi',
    title: 'Turning the arrow: Rabi oscillation',
    kicker: 'A gate is a rotation. Resonance is what lets the rotation go all the way.',
    body: (
      <>
        <Plain>
          <p>
            To move the arrow you shake the qubit with a field oscillating at the frequency that
            matches its energy gap. Shake at exactly that frequency and the arrow swings smoothly
            from north to south and back — hold the field on for half a swing and you have
            flipped the bit; a quarter swing puts it on the equator. Shake at the wrong frequency
            and the arrow only wobbles around a tilted axis, never reaching the far pole. The
            speed of the swing is set by how hard you shake.
          </p>
        </Plain>
        <Primer>
          <p>
            In a frame rotating at the drive frequency, a near-resonant drive of Rabi frequency Ω
            and detuning Δ = ω − ω<sub>0</sub> is a static effective field along (Ω, 0, Δ). The
            Bloch vector precesses about it at Ω′ = √(Ω² + Δ²). Starting from |0⟩,
          </p>
          <Eq label="Rabi formula">
            P(1)(t) = Ω²/(Ω² + Δ²) · sin²(Ω′ t / 2)
          </Eq>
          <p>
            so a complete inversion needs Δ = 0 and a pulse area Ω t = π. Pulse area, not
            duration, is what a gate specifies: the same rotation can be slow and weak or fast
            and strong. Real drives have Ω and Δ errors; composite sequences (several pulses with
            chosen phases) make the net rotation insensitive to them at first order — which is
            what the paper&rsquo;s ~{PAPER.raman.compositeUs} μs composite pulses do.
          </p>
        </Primer>
        <RabiDetuned />
      </>
    ),
  },
  {
    id: 'ramsey',
    title: 'Phase, and how to read it',
    kicker: 'The longitude is invisible — until a second pulse turns it into latitude.',
    body: (
      <>
        <Plain>
          <p>
            You cannot see the phase directly; any look returns only north or south. But you can
            make the qubit into a stopwatch. A quarter-swing puts the arrow on the equator, where
            its phase advances steadily at the qubit&rsquo;s own frequency. Wait. Then a second
            quarter-swing converts however far the phase has turned into a north–south tilt you
            can read. Repeat this with slightly different drive frequencies and the answer
            oscillates: fringes. Atomic clocks are exactly this measurement, and so is every
            test of how long a qubit remembers its phase.
          </p>
        </Plain>
        <Primer>
          <p>
            The Ramsey sequence π/2 – T – π/2 gives P(1) = cos²(φ/2) with φ = 2π δ T, where δ is
            the atom–drive frequency difference during T. The fringe period in δ is 1/T, so
            longer T resolves smaller frequency shifts. If δ fluctuates from shot to shot the
            fringes wash out; their contrast after time T is the coherence function, and its 1/e
            time is T<sub>2</sub>*. Refocusing pulses in the middle of T (spin echo, and its
            multi-pulse generalisation, dynamical decoupling) cancel shifts that are constant
            over the sequence, which is how the paper reaches a T<sub>2</sub> of {PAPER.qubit.trapT2s}{' '}
            on states whose bare dephasing would be far faster.
          </p>
        </Primer>
        <RamseyFringes />
      </>
    ),
  },
  {
    id: 'machine',
    title: 'Where this appears in the machine',
    kicker: 'Every rotation the paper performs is one of the moves above.',
    body: (
      <>
        <Defense>
          <p>
            The paper&rsquo;s qubit is the ⁸⁷Rb hyperfine clock pair, ω<sub>0</sub>/2π ≈{' '}
            {PAPER.qubit.hyperfineGHz} GHz. Single-qubit rotations are Rabi oscillations driven
            not by a microwave field directly but by a two-photon Raman transition (see{' '}
            <a href="#/foundations/light-and-atoms/raman">What light does to an atom</a>), with a
            global Rabi frequency of ~{PAPER.raman.globalRabiMHz} MHz and composite pulses of
            ~{PAPER.raman.compositeUs} μs; locally addressed rotations reach ~{PAPER.raman.localFidelityPct}%
            fidelity. Phase coherence is measured exactly as in the Ramsey figure and extended
            with dynamical decoupling to T<sub>2</sub> &gt; 1 s in the 852 nm tweezers (Methods).
            Readout is the projective measurement of the first figure, implemented by
            state-selective fluorescence after spin-to-position conversion (guide, chapter 09).
          </p>
        </Defense>
        <div className="claim-row">
          <Claim value={PAPER.qubit.hyperfineGHz} unit="GHz" source="qubit frequency" note="paper, Methods" />
          <Claim value={PAPER.raman.globalRabiMHz} unit="MHz" source="global Rabi frequency" note="paper, Methods" />
          <Claim value={PAPER.raman.localFidelityPct} unit="%" source="local single-qubit fidelity" note="paper, Methods" />
          <Claim value={PAPER.qubit.trapT2s} source="T₂ with dynamical decoupling" note="paper, Methods" />
        </div>
        <Note>
          Continue: <a href="#qubit">chapter 01, What a qubit is</a> · <a href="#control">chapter 07, who plays the lasers</a> ·{' '}
          <a href="#/foundations/rubidium-atom">where the two levels come from</a> ·{' '}
          <a href="#/foundations/entanglement">what two qubits can do that one cannot</a>.
        </Note>
        <Assumption>
          All figures use the idealised two-level model: no decay, no leakage to other levels,
          perfectly monochromatic drive, rotating-wave approximation (valid when Ω, |Δ| ≪ ω<sub>0</sub>,
          overwhelmingly so here). The Ramsey figure treats δ as constant during T; the rubidium
          page adds shot-to-shot spread. Nothing on this page is a paper measurement except the
          Level 3 numbers, which are cited to Methods.
        </Assumption>
      </>
    ),
  },
];
