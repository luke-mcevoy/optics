import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import { ChshBoard } from '../viz/foundations/ChshBoard.tsx';
import { CorrelationLab } from '../viz/foundations/CorrelationLab.tsx';
import { GateCircuit } from '../viz/foundations/GateCircuit.tsx';
import { ParityFidelity } from '../viz/foundations/ParityFidelity.tsx';
import type { FoundationSection } from './registry.tsx';

export const ENTANGLEMENT_SECTIONS: readonly FoundationSection[] = [
  {
    id: 'correlated',
    title: 'Correlated is not entangled',
    kicker: 'Two coins that always match are not mysterious. Two qubits that match along every axis are.',
    body: (
      <>
        <Plain>
          <p>
            Put a red ball in one box and a blue ball in another, shuffle, and mail them to two
            friends: whoever opens a red box knows the other is blue. That is correlation, and
            there is nothing quantum about it — the answer was fixed when the boxes were packed.
            Entangled qubits look like this if you only ever ask one question. Ask a different
            question — measure along a tilted axis — and the classical story falls apart: a pair
            of qubits can be guaranteed to agree along <em>any</em> axis both friends happen to
            choose, which no pre-packed answers can arrange.
          </p>
        </Plain>
        <Primer>
          <p>
            For the Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2 and measurements along axes at angles
            θ<sub>A</sub>, θ<sub>B</sub> from z in the x–z plane,
          </p>
          <Eq label="Bell-pair correlation versus a classical mixture with the same z statistics">
            E<sub>Bell</sub>(θ<sub>A</sub>, θ<sub>B</sub>) = cos(θ<sub>A</sub> − θ<sub>B</sub>), E<sub>mix</sub> = cos θ<sub>A</sub> cos θ<sub>B</sub>
          </Eq>
          <p>
            The mixture ρ = ½(|00⟩⟨00| + |11⟩⟨11|) has the same diagonal as |Φ+⟩⟨Φ+| but lacks the
            off-diagonal coherence ⟨00|ρ|11⟩ = ½; the coherence is what makes E depend only on the
            <em> relative</em> angle. An entangled pure state is one that cannot be written as
            |ψ<sub>A</sub>⟩ ⊗ |ψ<sub>B</sub>⟩; equivalently, its reduced states are mixed. Decoherence
            of a Bell pair is the decay of exactly that off-diagonal element — the pair drifts from
            the Bell curve toward the classical one.
          </p>
        </Primer>
        <CorrelationLab />
      </>
    ),
  },
  {
    id: 'gates',
    title: 'Making entanglement: the CZ gate',
    kicker: 'One sign flip on one amplitude, and two independent arrows become one inseparable pair.',
    body: (
      <>
        <Plain>
          <p>
            Single-qubit gates rotate one arrow at a time and can never make two qubits depend on
            each other. An entangling gate is one whose effect on the second qubit depends on the
            first. The simplest, the controlled-Z, does almost nothing: it flips the sign of the
            state only when both qubits are 1. Yet applied to two qubits on their equators it
            entangles them completely — each qubit alone becomes a coin toss along every axis,
            while the pair together is perfectly known. That gate is what the Rydberg blockade
            provides.
          </p>
        </Plain>
        <Primer>
          <p>
            CZ = diag(1, 1, 1, −1) in the |00⟩, |01⟩, |10⟩, |11⟩ basis. It is symmetric between
            the qubits and diagonal, so it commutes with Z rotations; with Hadamards on the target,
            (I⊗H)·CZ·(I⊗H) = CNOT. Any entangling two-qubit gate together with arbitrary
            single-qubit rotations is universal. In the blockade implementation, both atoms are
            driven to the Rydberg state and back: |11⟩ (both in the coupled ground level) picks
            up a different phase than |01⟩ and |10⟩ because the doubly excited state is shifted
            by V — a pulse sequence chosen so the phase difference is exactly π (Levine et al.
            2019, the scheme the paper uses in {PAPER.rydberg.gateNs} ns).
          </p>
        </Primer>
        <GateCircuit />
      </>
    ),
  },
  {
    id: 'bell',
    title: 'Bell’s test: proof you can run',
    kicker: 'A single number, ≤ 2 in any classical world, 2.83 for a Bell pair.',
    body: (
      <>
        <Plain>
          <p>
            &ldquo;No pre-assigned answers could do this&rdquo; sounds like philosophy, but it is a
            theorem with a number attached. Give each friend two possible questions, combine the
            four correlations in a particular way, and the result can never exceed 2 if the
            answers were fixed in advance — however cleverly the boxes were packed. Quantum
            mechanics predicts 2.83, and experiments find it. The paper runs this very test on
            its error-corrected logical qubits.
          </p>
        </Plain>
        <Primer>
          <p>
            With settings a, a′ for A and b, b′ for B,
          </p>
          <Eq label="CHSH inequality (Clauser–Horne–Shimony–Holt 1969)">
            S = E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′), |S| ≤ 2 (local realism), ≤ 2√2 (quantum, Tsirelson)
          </Eq>
          <p>
            The classical bound follows because for fixed ±1 values A, A′, B, B′ the expression
            A(B − B′) + A′(B + B′) has one bracket zero and the other ±2. A state of visibility V
            (correlations scaled by V) gives S = 2√2 V, so violation requires V &gt; 1/√2 ≈ 0.707 —
            a useful device-independent witness of entanglement that does not trust the
            measurement apparatus&rsquo;s calibration.
          </p>
        </Primer>
        <ChshBoard />
      </>
    ),
  },
  {
    id: 'fidelity',
    title: 'Measuring how good a pair is',
    kicker: 'Fidelity is not read off a screen; it is assembled from populations and a parity fringe.',
    body: (
      <>
        <Plain>
          <p>
            When a paper says a gate has &ldquo;99.6% fidelity&rdquo;, it means that the state it
            makes overlaps the ideal one by that much — but nobody can check a quantum state in
            one look. Instead many copies are made, half are simply read out (do they come out 00
            or 11 as they should?) and half are first given an extra twist and then read out, to
            check that the two halves of the superposition still carry a definite phase relative
            to each other. Together those two numbers bound the overlap.
          </p>
        </Plain>
        <Primer>
          <p>
            The Bell-state fidelity F = ⟨Φ+|ρ|Φ+⟩ = ½(ρ<sub>00,00</sub> + ρ<sub>11,11</sub>) + Re ρ<sub>00,11</sub>.
            The populations give the first term; the coherence is obtained from a parity
            oscillation — a global π/2 analysis pulse of variable phase φ, after which the parity
            Π(φ) oscillates at 2φ with amplitude C = 2|ρ<sub>00,11</sub>|. Hence
          </p>
          <Eq label="Bell fidelity from populations and parity contrast (Sackett et al. 2000)">
            F = (P<sub>00</sub> + P<sub>11</sub>)/2 + C/2
          </Eq>
          <p>
            Gate fidelities such as the paper&rsquo;s CZ value are extracted from repeated
            applications (randomised benchmarking or interleaved gate sequences) so that
            state-preparation and measurement errors are separated from the gate&rsquo;s own; the
            logical error rates elsewhere in the guide are a different quantity again — the
            probability that an encoded operation fails after decoding.
          </p>
        </Primer>
        <ParityFidelity />
      </>
    ),
  },
  {
    id: 'machine',
    title: 'Where this appears in the machine',
    kicker: 'Every two-qubit operation in the paper is a blockade-CZ dressed with single-qubit rotations.',
    body: (
      <>
        <Defense>
          <p>
            Entangling gates are executed in the entangling zone on pairs brought to{' '}
            {PAPER.beams.pairSpacingUm} μm by the AODs: a global {PAPER.rydberg.gateNs} ns Rydberg pulse
            applies CZ to every pair simultaneously (~{PAPER.rydberg.czFidelityPct}% fidelity, Methods).
            Transversal logical CNOTs between two surface-code patches are just this CZ applied
            pairwise across the patches, with Hadamards; the {PAPER.logic.optimalCnotsPerRound} optimal CNOT
            layers per round of chapter 12 are laid out this way. The paper&rsquo;s error-corrected
            CHSH value, {PAPER.codes.chsh}, is the test of the third figure run on logical qubits
            with error detection, and its logical Bell-pair preparation is characterised exactly as
            in the fourth. Fidelities quoted for physical gates and error rates for logical
            operations are distinct quantities and are kept separate in the claims ledger.
          </p>
        </Defense>
        <div className="claim-row">
          <Claim value={PAPER.rydberg.czFidelityPct} unit="%" source="physical CZ fidelity" note="paper, Methods" />
          <Claim value={PAPER.rydberg.gateNs} unit="ns" source="CZ duration" note="paper, Methods" />
          <Claim value={PAPER.codes.chsh} source="error-corrected CHSH" note="paper, Methods" />
          <Claim value={(2 * Math.SQRT2).toFixed(3)} source="Tsirelson bound 2√2" note="standard" />
        </div>
        <Note>
          Continue: <a href="#rydberg">chapter 04, how two atoms talk</a> · <a href="#logic">chapter 12, logic on coded bits</a> ·{' '}
          <a href="#/foundations/rydberg">Rydberg atoms</a> · <a href="#/foundations/error-correction">Why error correction can work</a>.
        </Note>
        <Assumption>
          Ideal two-qubit pure states and unitary gates throughout; the only noise model is
          uniform depolarisation in the fidelity board. Measurement outcomes in the correlation and
          CHSH boards are sampled from the exact quantum probabilities — a simulation of the
          statistics, not of any detection loophole. The blockade phase-gate mechanism is
          described, not simulated here (see the Rydberg page for the pair dynamics).
        </Assumption>
      </>
    ),
  },
];
