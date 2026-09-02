import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq, Sym } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import {
  clockQuadraticHzPerG2,
  clockSensitivityHzPerG,
  clockShiftHz,
  electronToNuclearMomentRatio,
  linearZeemanHzPerG,
  RB87_HFS,
} from '../physics/hyperfine.ts';
import { CoupledSpins } from '../viz/lazy.tsx';
import { Dephasing } from '../viz/foundations/Dephasing.tsx';
import { LevelLadder } from '../viz/foundations/LevelLadder.tsx';
import { ZeemanFan } from '../viz/foundations/ZeemanFan.tsx';
import type { FoundationSection } from './registry.tsx';

const B = PAPER.cooling.bFieldG;
const HFS_GHZ = RB87_HFS.groundSplittingHz / 1e9;
const Q = clockQuadraticHzPerG2();
const RATIO = Math.round(linearZeemanHzPerG(2, 1) / clockSensitivityHzPerG(B));

export const RUBIDIUM_ATOM_SECTIONS: readonly FoundationSection[] = [
  {
    id: 'ladder',
    title: 'A ladder of energies',
    kicker: 'An atom’s electron can only hold certain energies. Zoom in and every rung splits again.',
    body: (
      <>
        <Plain>
          <p>
            Picture the outer electron of a rubidium atom as sitting on a ladder. It can rest on
            a rung but never between rungs, and it moves between them only by absorbing or
            giving up a precise packet of energy — usually a particle of light whose colour
            matches the gap. The bottom rung is where the atom spends its life; the next one up
            is the &ldquo;excited&rdquo; state reached with deep-red laser light.
          </p>
          <p>
            Here is the surprise that this whole page is about: look closer at any rung and it
            turns out to be several rungs very close together. Look closer at <em>those</em>{' '}
            and they split again. The main guide&rsquo;s qubit lives on two rungs of the
            <em> third</em> level of that zoom — so close in energy that the &ldquo;light&rdquo;
            connecting them is a microwave, the kind of wave in a phone signal, not a colour
            you can see.
          </p>
        </Plain>
        <Primer>
          <p>
            The gross structure comes from the Coulomb attraction: the valence electron&rsquo;s
            energy depends on its principal quantum number n and orbital angular momentum ℓ
            (5S, 5P, …). Fine structure is the spin–orbit interaction: the electron&rsquo;s
            spin magnetic moment sees the magnetic field produced by its own orbital motion, so
            the orientation of spin relative to orbit costs or saves energy. For 5P this splits
            J = ℓ + s into J = ½ and J = 3/2, i.e. 5P<sub>1/2</sub> and 5P<sub>3/2</sub>,{' '}
            {((RB87_HFS.d2Hz - RB87_HFS.d1Hz) / 1e12).toFixed(3)} THz apart — the D1 and D2
            lines. The 5S ground state has ℓ = 0, so there is no orbital field and no fine
            structure there.
          </p>
          <p>
            Hyperfine structure is one level smaller: the <em>nucleus</em> is also a magnet.
            Its moment couples to the electron&rsquo;s, and the two spins lock into a total
            angular momentum <Sym>F = I + J</Sym>. For ⁸⁷Rb the nuclear spin is I = 3/2 and the
            ground-state electron has J = ½, so F = 1 or F = 2, with energies
          </p>
          <Eq label="magnetic-dipole hyperfine energy; A/h = 3.417 GHz for the ⁸⁷Rb ground state">
            E<sub>F</sub> = (A/2) [F(F+1) − I(I+1) − J(J+1)]
          </Eq>
          <p>
            which puts F = 2 at +3/8 and F = 1 at −5/8 of the splitting ΔE<sub>hfs</sub> = 2A
            = h × {HFS_GHZ.toFixed(6)} GHz. Because the nuclear moment is so small — about{' '}
            {Math.round(electronToNuclearMomentRatio())} times weaker than the electron&rsquo;s
            — this correction is a thousand times smaller than fine structure, which is itself
            fifty times smaller than the optical gap. The figure walks down all three.
          </p>
        </Primer>
        <LevelLadder />
      </>
    ),
  },
  {
    id: 'spins',
    title: 'Two magnets in one atom',
    kicker: 'F and m_F are not labels handed down from a textbook. They are two spins and a field.',
    body: (
      <>
        <Plain>
          <p>
            Both the electron and the nucleus spin, and a spinning charge is a little magnet.
            Two magnets near each other prefer certain relative orientations — roughly, aligned
            or opposed — and each arrangement has its own energy. That pair of arrangements
            <em> is</em> the pair of rungs the qubit uses. &ldquo;F = 2&rdquo; means the two
            magnets are mostly aligned; &ldquo;F = 1&rdquo; means mostly opposed.
          </p>
          <p>
            Now bring a magnetic field near the atom. A magnet in a field wants to point along
            it, and how far it is tilted from that direction changes its energy. Quantum
            mechanics allows only a few tilts — five for F = 2, three for F = 1 — and the label
            m<sub>F</sub> counts them. One of those tilts is exactly sideways, with no lean
            along the field at all. That is the m<sub>F</sub> = 0 state, and it is the one
            that does not care what the field does.
          </p>
        </Plain>
        <Primer>
          <p>
            In the vector model I and J precess rapidly about their resultant F, which is a
            constant of the motion while only the hyperfine interaction acts. The angle between
            them follows from <Sym>F² = I² + J² + 2 I·J</Sym> with each magnitude √(s(s+1)): the
            spins are neither parallel nor antiparallel but at fixed angles set by the quantum
            numbers. Switch on a field B and F itself precesses about B at the Larmor frequency
            |g<sub>F</sub>| μ<sub>B</sub> B/h, on a cone whose opening is fixed by the quantised
            projection m<sub>F</sub> = F·B̂. To first order the Zeeman energy is
          </p>
          <Eq label="first-order Zeeman shift; g_F ≈ +1/2 for F = 2 and −1/2 for F = 1 in the ⁸⁷Rb ground state">
            ΔE = g<sub>F</sub> m<sub>F</sub> μ<sub>B</sub> B
          </Eq>
          <p>
            so with μ<sub>B</sub>/h = {(RB87_HFS.muBHzPerG / 1e6).toFixed(3)} MHz/G each unit of
            m<sub>F</sub> is worth about {(linearZeemanHzPerG(2, 1) / 1e6).toFixed(2)} MHz per
            gauss — and m<sub>F</sub> = 0 is worth nothing.
          </p>
        </Primer>
        <CoupledSpins />
      </>
    ),
  },
  {
    id: 'zeeman',
    title: 'Turning on a field',
    kicker: 'Eight sublevels fan out with B. Two of them barely move — and “barely” has a number.',
    body: (
      <>
        <Plain>
          <p>
            Every real laboratory has stray magnetic fields, and they wobble: a passing lift, a
            power supply, the Earth&rsquo;s field itself. A qubit whose energy gap depends on the
            field will tick at a slightly different rate every time the field wobbles, and after
            a while the machine no longer knows what time the qubit thinks it is — the
            information is lost. Storing the bit in the two sideways-pointing states, whose gap
            hardly depends on the field, is the cheapest protection there is.
          </p>
        </Plain>
        <Primer>
          <p>
            For J = ½ the Zeeman problem has an exact closed form, the Breit–Rabi formula,
          </p>
          <Eq label="Breit–Rabi; x = (g_J − g_I) μ_B B / ΔE_hfs, ± for F = I ± ½">
            E(F, m<sub>F</sub>) = −ΔE<sub>hfs</sub>/(2(2I+1)) + g<sub>I</sub> μ<sub>B</sub> m<sub>F</sub> B ±
            (ΔE<sub>hfs</sub>/2) √(1 + 4 m<sub>F</sub> x/(2I+1) + x²)
          </Eq>
          <p>
            Expanding for small x recovers the linear shift above. For the two m<sub>F</sub> = 0
            states the linear term is absent and the transition between them shifts only as
            ΔE<sub>hfs</sub>(√(1+x²) − 1) ≈ {Q.toFixed(2)} Hz/G² × B²: the field mixes each
            m<sub>F</sub> = 0 level slightly with its neighbours and pushes the pair apart.
            Every field-sensitive number on this page follows from ΔE<sub>hfs</sub>, g<sub>J</sub>,
            g<sub>I</sub> and μ<sub>B</sub>, and the figure computes them live.
          </p>
        </Primer>
        <ZeemanFan />
      </>
    ),
  },
  {
    id: 'clock',
    title: 'Why this makes a good qubit',
    kicker: 'Turn a field sensitivity into a memory time.',
    body: (
      <>
        <Plain>
          <p>
            Imagine forty identical atoms started in step, like forty stopwatches pressed at
            once. If each sees a slightly different field, each ticks at a slightly different
            rate and they drift out of step. How long they stay together is the qubit&rsquo;s
            memory time. Put the bit on a field-sensitive pair and, with a realistic
            thousandth-of-a-gauss wobble, they scatter in a fraction of a millisecond. Put it on
            the clock pair and they stay together {RATIO} times longer — for the same atoms and the
            same wobble.
          </p>
        </Plain>
        <Primer>
          <p>
            Quasi-static field noise with rms σ<sub>B</sub> spreads the transition frequency by
            σ<sub>ν</sub> = (dν/dB) σ<sub>B</sub>. A Ramsey experiment then sees its contrast
            decay as exp(−(2π σ<sub>ν</sub> t)²/2), with 1/e time T<sub>2</sub>* =
            1/(√2 π σ<sub>ν</sub>). At the paper&rsquo;s {B} G the clock transition has dν/dB
            = 2 × {Q.toFixed(1)} Hz/G² × B = {(clockSensitivityHzPerG(B) / 1e3).toFixed(1)} kHz/G,
            against {(linearZeemanHzPerG(2, 1) / 1e3).toFixed(0)} kHz/G for a
            |2,0⟩ ↔ |2,+1⟩ qubit — a factor {RATIO}. Note that this is not yet the paper&rsquo;s
            1–2 s coherence: that also needs dynamical decoupling, which echoes away slow shifts,
            and it is limited by other things (tweezer light shifts, motion) once field noise is
            suppressed this far.
          </p>
        </Primer>
        <Dephasing />
      </>
    ),
  },
  {
    id: 'machine',
    title: 'Where this appears in the machine',
    kicker: 'Every place the guide says “hyperfine”, “clock state” or “m_F”, this is what it means.',
    body: (
      <>
        <Defense>
          <p>
            The paper encodes each qubit in the 5S<sub>1/2</sub> clock states |F=1, m<sub>F</sub>=0⟩
            and |F=2, m<sub>F</sub>=0⟩ (Methods, system overview), driven by Raman light
            referenced to a {PAPER.qubit.hyperfineGHz} GHz microwave source. It runs at a bias
            field of {B} G so that the Zeeman sublevels are resolved for optical pumping,
            state-selective operations and imaging; at that field the clock transition is
            offset by {(clockShiftHz(B) / 1e3).toFixed(1)} kHz from its zero-field value and its
            residual field sensitivity is {(clockSensitivityHzPerG(B) / 1e3).toFixed(1)} kHz/G.
            The other six sublevels are leakage states: population that ends up there after an
            imperfect gate is outside the computational subspace, which is why the paper counts
            hyperfine leakage separately from bit flips and why the spin-to-position readout
            first pumps |1⟩ into the stretched state |2,−2⟩ (chapter 09). The measured
            coherence time of 1–2 s (Methods, error budget) is reached with dynamical
            decoupling on this clock transition.
          </p>
        </Defense>
        <div className="claim-row">
          <Claim value={HFS_GHZ.toFixed(6)} unit="GHz" source="ground hyperfine splitting" note="Steck; the qubit frequency" />
          <Claim value={Q.toFixed(1)} unit="Hz/G²" source="clock-state quadratic shift" note="Breit–Rabi, computed here" />
          <Claim value={B} unit="G" source="operating bias field" note="paper, Methods" />
          <Claim value={RATIO} unit="×" source="less field-sensitive than m_F = ±1" note={`at ${B} G, computed here`} />
        </div>
        <Note>
          Continue in the guide: <a href="#qubit">chapter 01, What a qubit is</a> ·{' '}
          <a href="#rubidium">chapter 02, The atom</a> · <a href="#readout">chapter 09, reading a bit</a>.
        </Note>
        <Assumption>
          Data: ⁸⁷Rb ground-state splitting, A<sub>hfs</sub>, g<sub>J</sub>, g<sub>I</sub>, D-line
          frequencies and excited-state hyperfine constants from D. A. Steck, <em>Rubidium 87 D
          Line Data</em> (steck.us/alkalidata); μ<sub>B</sub>/h from CODATA. The hyperfine
          energies use the magnetic-dipole term only (exact for J = ½). Vector-model pictures are
          semiclassical: they give the right angles and projections but the precessions on
          screen are slowed and not mutually to scale. The dephasing figure models quasi-static
          Gaussian field noise only. The paper states the encoding and the bias field; every
          field-sensitivity number is computed on this page and is not quoted from the paper.
        </Assumption>
      </>
    ),
  },
];
