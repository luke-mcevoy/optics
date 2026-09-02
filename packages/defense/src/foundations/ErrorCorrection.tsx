import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import { ERASURE_THRESHOLD, PAULI_THRESHOLD } from '../physics/qec.ts';
import { ErasureBoard } from '../viz/foundations/ErasureBoard.tsx';
import { MagicState } from '../viz/foundations/MagicState.tsx';
import { RepetitionCode } from '../viz/foundations/RepetitionCode.tsx';
import { SurfaceCodeLab } from '../viz/foundations/SurfaceCodeLab.tsx';
import { SyndromeCircuit } from '../viz/foundations/SyndromeCircuit.tsx';
import { ThresholdPlot } from '../viz/foundations/ThresholdPlot.tsx';
import type { FoundationSection } from './registry.tsx';

export const QEC_SECTIONS: readonly FoundationSection[] = [
  {
    id: 'redundancy',
    title: 'Redundancy, and why copying is not allowed',
    kicker: 'Classical error correction repeats the bit. Quantum mechanics forbids repeating a qubit — so it spreads it instead.',
    body: (
      <>
        <Plain>
          <p>
            Every noisy channel is tamed the same way: say it three times and take the majority.
            Three copies fail only if two of them fail at once, so an error rate p becomes about
            3p² — a big win when p is small, a loss when p is large, and the two regimes meet at
            exactly p = ½. Qubits add two obstacles. You cannot copy an unknown quantum state (the
            no-cloning theorem), and you cannot look at the qubits to vote, because looking
            collapses them. The way out is to <em>entangle</em> the information across several
            qubits instead of copying it, and to ask the qubits only about their disagreements —
            never about their values.
          </p>
        </Plain>
        <Primer>
          <Eq label="Majority vote on n copies, independent flips at rate p">
            P<sub>L</sub> = Σ<sub>k&gt;n/2</sub> C(n,k) p<sup>k</sup> (1−p)<sup>n−k</sup> ≈ C(n, ⌈n/2⌉) p<sup>⌈n/2⌉</sup> for p ≪ 1
          </Eq>
          <p>
            No-cloning: there is no unitary U with U|ψ⟩|0⟩ = |ψ⟩|ψ⟩ for all |ψ⟩, since linearity
            would force U(α|0⟩ + β|1⟩)|0⟩ = α|00⟩ + β|11⟩, which is not (α|0⟩ + β|1⟩)<sup>⊗2</sup>.
            But that very state, α|000⟩ + β|111⟩, is the quantum repetition code — the amplitudes
            are not copied, they are shared. Its parities Z<sub>i</sub>Z<sub>j</sub> equal +1 on both
            branches, so they can be measured without disturbing α, β.
          </p>
        </Primer>
        <RepetitionCode />
      </>
    ),
  },
  {
    id: 'stabilizers',
    title: 'Measuring parity without measuring the bit',
    kicker: 'The syndrome tells you where the error is and nothing else. That “nothing else” is the whole trick.',
    body: (
      <>
        <Plain>
          <p>
            Ask two qubits &ldquo;are you the same or different?&rdquo; and you learn one bit — but
            not what either of them is. For an encoded state whose qubits should all agree, a
            &ldquo;different&rdquo; answer flags an error and its location, while the encoded
            superposition sails through untouched. Every quantum code works this way: a list of
            such agreement checks (stabilizers) that all read +1 when nothing has gone wrong, and a
            lookup from the pattern of −1&rsquo;s (the syndrome) to the most likely culprit.
          </p>
        </Plain>
        <Primer>
          <p>
            A stabilizer code is the joint +1 eigenspace of a set of commuting Pauli operators
            {'{'}S<sub>i</sub>{'}'}. An error E anticommutes with some of them, flipping those
            eigenvalues to −1; the syndrome is that bit string. Because the S<sub>i</sub> commute
            with the logical operators, measuring them is compatible with any encoded state:
          </p>
          <Eq label="Why the syndrome carries no logical information">
            S<sub>i</sub>|ψ<sub>L</sub>⟩ = +|ψ<sub>L</sub>⟩ for every code state ⇒ measuring S<sub>i</sub> has a deterministic outcome and leaves |ψ<sub>L</sub>⟩ unchanged
          </Eq>
          <p>
            In practice a check is measured by an ancilla: CNOTs from the data qubits to a fresh
            ancilla accumulate their parity, then the ancilla is read. Bit flips (X) are caught by
            Z-type checks; phase flips (Z) by X-type checks — the same construction in the
            Hadamard-rotated basis. A code with both kinds, like the surface code, corrects any
            single-qubit error, since Y = iXZ is caught by both.
          </p>
        </Primer>
        <SyndromeCircuit />
      </>
    ),
  },
  {
    id: 'surface',
    title: 'The surface code',
    kicker: 'A checkerboard of parity checks on a grid of qubits. Errors are chains; the syndrome shows their ends.',
    body: (
      <>
        <Plain>
          <p>
            Lay qubits on a grid and let every square ask its four neighbours &ldquo;even or
            odd?&rdquo;. A single flipped qubit lights the two squares beside it. Two adjacent
            flipped qubits light only the two squares at the <em>ends</em> of the pair — the middle
            square sees two flips and reports &ldquo;even&rdquo;. So the syndrome is a picture of
            chain endpoints, and the decoder&rsquo;s job is to connect the dots along the shortest
            paths and undo whatever it thinks happened. It fails only when a chain of errors plus
            its guessed correction runs all the way across the grid: that is a logical error, and
            the grid&rsquo;s width d is the number of errors it takes to make one.
          </p>
        </Plain>
        <Primer>
          <p>
            The planar surface code of distance d uses d² + (d−1)² data qubits and 2d(d−1)
            checks, half Z-type (vertices) and half X-type (plaquettes), encoding one logical
            qubit; the <em>rotated</em> variant the paper runs trims this to d² data qubits with the
            same distance. Logical X̄ is any X-chain between the two rough boundaries, logical Z̄ any Z-chain
            between the smooth ones; each has weight d, so up to t = ⌊(d−1)/2⌋ arbitrary errors are
            always corrected. Decoding is minimum-weight perfect matching of the syndrome
            defects — the most probable error class under independent noise — and is efficient.
            Only nearest-neighbour checks are needed, which is why it fits a 2D array of atoms.
          </p>
        </Primer>
        <SurfaceCodeLab />
      </>
    ),
  },
  {
    id: 'threshold',
    title: 'Distance, threshold and Λ',
    kicker: 'Below a critical error rate, every increase in code size buys an exponential improvement. Above it, nothing helps.',
    body: (
      <>
        <Plain>
          <p>
            A bigger code has more qubits that can fail but also needs more of them to fail
            together. Which effect wins depends on how noisy each qubit is. There is a sharp
            crossover, the threshold: below it, going from a 3-wide to a 5-wide to a 7-wide grid
            makes the logical qubit better and better, roughly by a fixed factor each step; above
            it, bigger only means worse. Demonstrating that factor — Λ &gt; 1 — on a real machine is
            what &ldquo;below threshold&rdquo; means, and it is the headline of the paper.
          </p>
        </Plain>
        <Primer>
          <Eq label="Leading-order scaling below threshold">
            P<sub>L</sub>(d) ≈ A (p / p<sub>th</sub>)<sup>⌈d/2⌉</sup> ⇒ Λ ≡ P<sub>L</sub>(d) / P<sub>L</sub>(d+2) ≈ p<sub>th</sub> / p
          </Eq>
          <p>
            For independent Pauli noise with perfect syndrome measurement the planar code&rsquo;s
            threshold is p<sub>th</sub> ≈ {(PAULI_THRESHOLD * 100).toFixed(1)}% (matching decoder). With
            noisy measurements repeated over d rounds, the relevant threshold is for the 3D
            space–time decoding problem and drops to ≈ 0.5–1% per operation in circuit-level
            models. The paper reports Λ = {PAPER.qec.belowThreshold}({PAPER.qec.belowThresholdUnc}) from
            d = 3 to d = 5 with four rounds of syndrome extraction, i.e. a logical error per round of{' '}
            {PAPER.qec.d5LeprPct}({PAPER.qec.d5LeprUnc})% against {PAPER.qec.d3LeprPct}% — a statement about
            slope, not about absolute size.
          </p>
        </Primer>
        <ThresholdPlot />
      </>
    ),
  },
  {
    id: 'erasure',
    title: 'Erasure: errors with a return address',
    kicker: 'Knowing which qubit failed is worth more than knowing how it failed.',
    body: (
      <>
        <Plain>
          <p>
            A Pauli error is a needle in a haystack: the decoder must infer both where and what.
            But many failures in an atom array announce themselves — the atom flies out of its
            trap, or is pushed into a level the camera can see it is not supposed to be in. Such
            an <em>erasure</em> is an error with a return address. The decoder no longer has to
            guess where; it only has to fill in what, and for that it has the parity checks around
            the hole. Errors of this kind can be tolerated at a rate roughly five times higher.
          </p>
        </Plain>
        <Primer>
          <p>
            Erased qubits are reset to a known state, equivalent to a uniformly random Pauli on a
            known location. The peeling decoder solves the syndrome restricted to the erased
            support in linear time and is optimal; it fails only when the erasure pattern contains
            a logical operator — a cluster spanning the code — which is percolation, so the
            threshold is the bond-percolation point of the lattice, p<sub>c</sub> = {ERASURE_THRESHOLD} for
            the square lattice, versus ≈ {(PAULI_THRESHOLD * 100).toFixed(0)}% for Pauli errors. With
            circuit-level noise the erasure threshold is still several times the Pauli one. Any
            fraction of errors converted from Pauli to erasure moves the code toward the higher
            threshold, which is the point of &ldquo;erasure conversion&rdquo;.
          </p>
        </Primer>
        <ErasureBoard />
      </>
    ),
  },
  {
    id: 'magic',
    title: 'Clifford gates, magic states and why T is expensive',
    kicker: 'The gates a code applies easily are exactly the ones a classical computer could simulate. Universality must be bought.',
    body: (
      <>
        <Plain>
          <p>
            Some gates can be applied to an encoded qubit by applying them to each physical qubit
            separately — no chance for an error to spread. For the surface code those are the
            Clifford gates, and there is a catch: a circuit made only of Clifford gates can be run
            on a laptop. The one extra ingredient for a real quantum computer, the T gate, cannot
            be applied that way in any code (Eastin–Knill). The standard solution is to prepare a
            special &ldquo;magic&rdquo; state offline, check it carefully, and then consume it to
            perform T using only Clifford gates and a measurement.
          </p>
        </Plain>
        <Primer>
          <p>
            The Clifford group is the normaliser of the Pauli group: it maps Paulis to Paulis and
            therefore stabilizer states to stabilizer states. Gottesman–Knill: stabilizer states
            evolving under Cliffords and Pauli measurements are classically simulable in polynomial
            time. Clifford + T is universal. Eastin–Knill: no code detecting all single-qubit errors
            has a transversal, universal gate set. Hence gate injection:
          </p>
          <Eq label="T-gate teleportation with a magic state |T⟩ = (|0⟩ + e^{iπ/4}|1⟩)/√2">
            CNOT<sub>anc→data</sub> (|T⟩ ⊗ |ψ⟩), measure data in Z: m = 0 ⇒ anc = T|ψ⟩; m = 1 ⇒ anc = S X T|ψ⟩ → apply S X
          </Eq>
          <p>
            Every operation but the preparation of |T⟩ is Clifford or a measurement; |T⟩ itself is
            made noisily and purified by distillation, whose cost dominates fault-tolerant
            algorithms. Logical measurement with Pauli-frame feed-forward — recording, not
            applying, the Pauli corrections — is the same principle that lets the paper defer
            corrections to software.
          </p>
        </Primer>
        <MagicState />
      </>
    ),
  },
  {
    id: 'machine',
    title: 'Where this appears in the machine',
    kicker: 'Each chapter of the guide from 10 onward is one of these ideas running on real atoms.',
    body: (
      <>
        <Defense>
          <p>
            Chapters 10–11: rotated surface codes at d = 3 and d = 5 ({3 * 3} and {5 * 5} data qubits;
            the boards above use the unrotated layout, which has the same distance and the same
            decoding problem), with ancilla atoms shuttled in to measure the checks each round ({PAPER.control.qecRoundMs} ms
            per round), a Pauli-frame kept in software, and Λ = {PAPER.qec.belowThreshold}(
            {PAPER.qec.belowThresholdUnc}) over four rounds. Loss and leakage are converted to erasure
            information by imaging ({PAPER.qec.leakageIsLossPct}% of leakage detected as loss) and passed
            to the matching decoder, for a {PAPER.qec.lossMlGain}× gain. Chapter 12: transversal
            Clifford logic between patches ({PAPER.logic.optimalCnotsPerRound} CNOT layers per round)
            plus lattice-surgery measurements. Chapter 13: the [[15,1,3]] Reed–Muller code, whose
            transversal T gate lets magic states be prepared and injected as in the last board —{' '}
            {PAPER.codes.tGatesShown} logical T gates demonstrated. The correlated-decoding and
            erasure results are statements about how the decoder uses information, exactly the
            distinctions drawn above.
          </p>
        </Defense>
        <div className="claim-row">
          <Claim value={PAPER.qec.belowThreshold} unit="Λ" source="d=3 → d=5" note="paper, Fig. 2" />
          <Claim value={`${PAPER.qec.d5LeprPct}%`} source="d=5 logical error / round" note="paper" />
          <Claim value={`${PAPER.qec.lossMlGain}×`} source="gain from loss information" note="paper" />
          <Claim value={`${(PAULI_THRESHOLD * 100).toFixed(1)}% / ${ERASURE_THRESHOLD * 100}%`} source="Pauli / erasure thresholds (ideal)" note="standard" />
        </div>
        <Note>
          Continue: <a href="#why-code">chapter 10, why code at all</a> · <a href="#qec">chapter 11, below threshold</a> ·{' '}
          <a href="#universal">chapter 13, magic states</a> · <a href="#/foundations/entanglement">Entanglement and two-qubit gates</a>.
        </Note>
        <Assumption>
          Independent, identically distributed errors on data qubits only; perfect syndrome
          extraction (no measurement errors, no ancilla faults, single round). One error sector
          (X) is simulated; the Z sector is the exact dual. The matching decoder is exact
          minimum-weight for ≤14 defects and greedy otherwise, which slightly understates
          performance at high error rates. Thresholds quoted for these idealisations are not the
          paper&rsquo;s circuit-level thresholds. Teleportation and stabilizer boards are exact
          state-vector calculations on one and two qubits.
        </Assumption>
      </>
    ),
  },
];
