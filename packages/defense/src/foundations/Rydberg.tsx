import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import { blockadeRadiusUm, rbC6EstimateGHzUm6 } from '../physics/beams.ts';
import { lifetimeS, meanRadiusUm } from '../physics/rydberg.ts';
import { BlockadeLevels } from '../viz/foundations/BlockadeLevels.tsx';
import { RydbergLadder } from '../viz/foundations/RydbergLadder.tsx';
import { ScalingLaws } from '../viz/foundations/ScalingLaws.tsx';
import { VdwPair3D } from '../viz/lazy.tsx';
import type { FoundationSection } from './registry.tsx';

const N = PAPER.rydberg.n;
const RB_UM = blockadeRadiusUm(rbC6EstimateGHzUm6(N), PAPER.rydberg.rabiMHz);

export const RYDBERG_SECTIONS: readonly FoundationSection[] = [
  {
    id: 'ladder',
    title: 'A hydrogen atom the size of a bacterium',
    kicker: 'Kick the outer electron almost free and the atom becomes huge, fragile, and talkative.',
    body: (
      <>
        <Plain>
          <p>
            Rubidium has one outer electron orbiting a tightly bound core, and that core looks,
            from far enough away, like a single positive charge — so the outer electron behaves
            almost exactly like the electron in hydrogen. Pump enough energy into it and it moves
            to an orbit thousands of times larger than the ground state, taking the atom from a
            fraction of a nanometre to nearly half a micrometre across. Such <em>Rydberg</em>{' '}
            atoms are barely bound: the electron circles slowly, the levels crowd together near
            the ionisation limit, and any nearby charge or field can push the electron around.
          </p>
        </Plain>
        <Primer>
          <p>
            The energies follow the Rydberg formula with a quantum defect that accounts for the
            electron&rsquo;s occasional penetration of the core,
          </p>
          <Eq label="Rydberg–Ritz formula; δ_s ≈ 3.13 for Rb S states">
            E<sub>nℓ</sub> = −R<sub>Rb</sub> / (n − δ<sub>ℓ</sub>)² = −R<sub>Rb</sub> / n*²
          </Eq>
          <p>
            Everything else follows from n*: ⟨r⟩ ≈ (3/2) n*² a₀, level spacing 2R<sub>Rb</sub>/n*³,
            classical period 2π n*³ atomic units, radiative lifetime ∝ n*³ (with a 300 K
            black-body contribution ∝ n*² that dominates at high n), transition dipoles ∝ n*² e a₀.
            The paper&rsquo;s {N}S state is ~{meanRadiusUm(N).toFixed(2)} μm in radius and lives
            ~{(lifetimeS(N) * 1e6).toFixed(0)} μs at room temperature — a long time next to a
            {' '}{PAPER.rydberg.gateNs} ns gate, short next to the seconds-long circuit, which is why
            atoms are only excited to it for the duration of a gate.
          </p>
        </Primer>
        <RydbergLadder />
      </>
    ),
  },
  {
    id: 'scaling',
    title: 'Scaling laws',
    kicker: 'Every property is a power of n. The exponents decide what n to use.',
    body: (
      <>
        <Plain>
          <p>
            Because the Rydberg electron is nearly hydrogenic, every property scales as a clean
            power of the principal quantum number. Size goes as n², the strength of the
            interaction between two Rydberg atoms as n¹¹, the sensitivity to electric fields as
            n⁷. Higher n means atoms that talk to each other more strongly and from further away,
            but also atoms that are more easily disturbed by stray fields and more crowded by
            neighbouring levels. Experiments settle on n in the fifties to seventies as the
            compromise.
          </p>
        </Plain>
        <Primer>
          <p>
            The interaction scaling deserves a derivation. Two atoms in the same nS state have no
            permanent dipole; the interaction is second order in the dipole–dipole coupling
            V<sub>dd</sub> ~ d²/R³ with d ~ n*² e a₀, divided by the energy defect δ<sub>F</sub> to
            the nearest pair state (nP + (n−1)P), which scales as the level spacing n*⁻³:
          </p>
          <Eq label="van der Waals coefficient scaling">
            V = C₆/R⁶, C₆ ~ d⁴/δ<sub>F</sub> ∝ (n*²)⁴ / n*⁻³ = n*¹¹
          </Eq>
          <p>
            At short range (R ≲ (d²/δ<sub>F</sub>)<sup>1/3</sup>, a few μm at n ≈ 50) the interaction
            crosses over to resonant dipole–dipole 1/R³ behaviour; the paper&rsquo;s 2 μm gate
            spacing at n = {N} sits near this crossover, and the exact C₆ depends on the fine-structure
            channel and the angle to the quantisation axis. The board uses the n*¹¹ law anchored on
            the measured 70S value and should be read as an estimate to ~30%.
          </p>
        </Primer>
        <ScalingLaws />
      </>
    ),
  },
  {
    id: 'vdw',
    title: 'How two giants talk',
    kicker: 'Fluctuating dipoles, a shift that grows as 1/R⁶, and a radius inside which only one atom may be excited.',
    body: (
      <>
        <Plain>
          <p>
            Two Rydberg atoms a few micrometres apart feel each other through their electric
            fields. Neither has a fixed dipole, but each electron cloud flickers, and the flicker
            of one induces a matching flicker in the other; the correlated pair has a lower (or
            higher) energy than two isolated atoms — the same van der Waals force that lets geckos
            climb walls, enormously amplified by the size of the atoms. The shift falls off as the
            sixth power of distance, so it is essentially a cliff: enormous inside a few
            micrometres, negligible beyond.
          </p>
          <p>
            That cliff is the trick. A laser tuned to lift one atom into the Rydberg state is
            <em> not</em> tuned to lift the second one if the first is already there, because the
            second atom&rsquo;s resonance has moved. Within the &ldquo;blockade radius&rdquo; only one
            excitation fits.
          </p>
        </Plain>
        <Primer>
          <p>
            Blockade requires V(R) ≫ ħΩ, where Ω is the Rydberg Rabi frequency; the boundary is
            the blockade radius
          </p>
          <Eq label="blockade radius">
            R<sub>b</sub> = (C₆ / ħΩ)<sup>1/6</sup>
          </Eq>
          <p>
            For the paper&rsquo;s n = {N} and Ω/2π = {PAPER.rydberg.rabiMHz} MHz this gives
            R<sub>b</sub> ≈ {RB_UM.toFixed(1)} μm (with the estimated C₆), against a gate spacing of
            {' '}{PAPER.beams.pairSpacingUm} μm — so pairs are deep in the blockaded regime — while atoms in
            neighbouring gate sites tens of micrometres away barely interact. The sixth-power law is
            what makes both statements true at once, and it is why Rydberg gates are naturally
            local: turn the interaction on by exciting, off by de-exciting, with nothing left over.
          </p>
        </Primer>
        <VdwPair3D />
      </>
    ),
  },
  {
    id: 'blockade',
    title: 'Blockade, quantitatively',
    kicker: 'Three pair states, one laser, and an oscillation that speeds up by √2.',
    body: (
      <>
        <Plain>
          <p>
            Shine the Rydberg laser on two atoms close together and neither &ldquo;decides&rdquo;
            to be the one excited. Instead the pair oscillates between &ldquo;both in the ground
            state&rdquo; and a shared state in which one excitation is spread over both atoms —
            and it does so faster than a single atom would, by exactly the square root of two.
            That speed-up is a measurable signature that the two atoms are behaving as one
            quantum object; it also means a pulse timed to flip a lone atom will not quite flip a
            pair, which is the seed of the two-qubit gate.
          </p>
        </Plain>
        <Primer>
          <p>
            In the symmetric basis {'{'}|gg⟩, |W⟩ = (|gr⟩+|rg⟩)/√2, |rr⟩{'}'} the Hamiltonian
            (ħ = 1) is
          </p>
          <Eq label="two driven atoms with a van der Waals shift on |rr⟩">
            H = (Ω/√2)(|gg⟩⟨W| + |W⟩⟨rr| + h.c.) + V |rr⟩⟨rr|
          </Eq>
          <p>
            For V = 0 this reproduces two independent Rabi oscillations. For V ≫ Ω the |rr⟩ state
            is adiabatically eliminated and the remaining two-level system {'{'}|gg⟩, |W⟩{'}'}{' '}
            oscillates at √2 Ω. The board integrates the full three-level dynamics for the
            chosen separation; the {PAPER.rydberg.gateNs} ns gate of the paper is a designed pulse
            in exactly this system (with single-atom phases chosen so that the accumulated phase
            differs by π between the blockaded and unblockaded branches — chapter 04).
          </p>
        </Primer>
        <BlockadeLevels />
      </>
    ),
  },
  {
    id: 'machine',
    title: 'Where this appears in the machine',
    kicker: 'Two colours, one blockade, 270 nanoseconds.',
    body: (
      <>
        <Defense>
          <p>
            The paper excites 5S → {N}S with a two-photon transition: {PAPER.rydberg.blueNm} nm and{' '}
            {PAPER.rydberg.irNm} nm beams, detuned by {PAPER.rydberg.intermediateDetuningGHz} GHz from the
            intermediate 6P state, with an effective Rabi frequency of {PAPER.rydberg.rabiMHz} MHz. The
            entangling gate is a {PAPER.rydberg.gateNs} ns global pulse on pairs of atoms brought to
            {' '}{PAPER.beams.pairSpacingUm} μm spacing in the entangling zone, achieving a CZ fidelity of ~{PAPER.rydberg.czFidelityPct}%
            (Methods). The Rydberg beams are shaped into a {PAPER.beams.rydbergTophatUm} μm top-hat so that
            all pairs in the zone see the same Ω; the {PAPER.surface.homogeneityPct}% homogeneity across{' '}
            {PAPER.surface.homogeneityExtentUm} μm is what allows one global pulse to serve many gates.
            Atoms return to the ground state at the end of every gate; time spent in the Rydberg
            state (lifetime ~{(lifetimeS(N) * 1e6).toFixed(0)} μs at 300 K) is the dominant intrinsic
            gate-error mechanism.
          </p>
        </Defense>
        <div className="claim-row">
          <Claim value={N} source="Rydberg principal quantum number" note="paper, Methods" />
          <Claim value={PAPER.rydberg.gateNs} unit="ns" source="CZ gate duration" note="paper, Methods" />
          <Claim value={PAPER.rydberg.czFidelityPct} unit="%" source="CZ fidelity" note="paper, Methods" />
          <Claim value={RB_UM.toFixed(1)} unit="μm" source="blockade radius (estimate)" note="derived: C₆ n*¹¹ law + paper Ω" />
        </div>
        <Note>
          Continue: <a href="#rydberg">chapter 04, how two atoms talk</a> ·{' '}
          <a href="#/foundations/entanglement">Entanglement and two-qubit gates</a> ·{' '}
          <a href="#/foundations/rubidium-atom">the ground state, for contrast</a>.
        </Note>
        <Assumption>
          Quantum-defect (n*) scaling with δ<sub>s</sub> = 3.131; lifetimes from the Beterov et al.
          fit plus the Gallagher black-body formula; C₆ from the n*¹¹ law anchored on 70S (Bernien
          et al. 2017), ignoring angular dependence and the Förster crossover at short range. The
          blockade board is the ideal three-level model: no decay, no laser noise, perfect
          symmetry between the two atoms. Only n, wavelengths, Ω, gate time and fidelity are paper
          numbers.
        </Assumption>
      </>
    ),
  },
];
