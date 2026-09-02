import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import { DrivenDipole } from '../viz/foundations/DrivenDipole.tsx';
import { RamanLambda } from '../viz/foundations/RamanLambda.tsx';
import { SelectionRules } from '../viz/foundations/SelectionRules.tsx';
import { TweezerTrap3D } from '../viz/lazy.tsx';
import type { FoundationSection } from './registry.tsx';

export const LIGHT_SECTIONS: readonly FoundationSection[] = [
  {
    id: 'dipole',
    title: 'The atom as a driven spring',
    kicker: 'Everything light does to an atom — shift, force, scatter — follows from one phase lag.',
    body: (
      <>
        <Plain>
          <p>
            Picture the outer electron of the atom as a bead on a spring. Light is an electric
            field wobbling back and forth, so it shakes the bead. If you shake a spring slower
            than its natural rhythm, the bead follows your hand; shake it faster and it moves
            opposite to your hand. That single fact — which way the bead moves relative to the
            field — decides whether the atom is pulled into bright light or pushed out of it. Red
            light (slower than the atom&rsquo;s resonance) pulls; blue light pushes. Shake
            exactly at the resonance and the bead absorbs energy instead: the atom scatters
            photons.
          </p>
        </Plain>
        <Primer>
          <p>
            Near a resonance ω<sub>0</sub> the induced dipole is d = α(ω) E with a complex
            polarizability; in the two-level, rotating-wave picture α ∝ −(Δ + iΓ/2)/(Δ² + Γ²/4)
            with Δ = ω − ω<sub>0</sub>. The real part gives a time-averaged energy
          </p>
          <Eq label="light shift (AC Stark shift) of the ground state">
            U = −½ Re α · ⟨E²⟩ = −(Re α / 2ε<sub>0</sub>c) · I(r)
          </Eq>
          <p>
            which is a potential energy that depends on position through I(r): a force F = −∇U
            toward high intensity when Re α &gt; 0 (red detuning). The imaginary part gives the
            photon scattering rate Γ<sub>sc</sub> ∝ Im α · I. Far from resonance Re α ∝ 1/Δ and
            Im α ∝ 1/Δ², so their ratio is U/ħΓ<sub>sc</sub> = Δ/Γ: detune far, and you keep the
            potential while the scattering — which heats the atom and scrambles the qubit —
            vanishes. The trade is paid in laser power, since U ∝ I/Δ.
          </p>
        </Primer>
        <DrivenDipole />
      </>
    ),
  },
  {
    id: 'tweezer',
    title: 'The optical tweezer',
    kicker: 'A focused red beam is a bowl of light shift a few millikelvin deep.',
    body: (
      <>
        <Plain>
          <p>
            Focus a red-detuned laser to a spot a micrometre across and the pull toward bright
            light becomes a tiny bowl, deepest at the focus. A cold enough atom falls in and
            rattles around inside it, held by nothing but light. That is an optical tweezer. Make
            hundreds of focused spots at once and you have an array of atoms, each in its own
            bowl, which is exactly what the machine in the main guide does with its{' '}
            {PAPER.slm.wavelengthNm} nm light.
          </p>
        </Plain>
        <Primer>
          <p>
            For a Gaussian beam of power P and waist w<sub>0</sub>, the peak intensity is
            I<sub>0</sub> = 2P/πw<sub>0</sub>² and the trap depth U<sub>0</sub> = |U(I<sub>0</sub>)|.
            Near the bottom the bowl is harmonic with
          </p>
          <Eq label="trap frequencies of a Gaussian-beam tweezer">
            ω<sub>r</sub> = √(4U<sub>0</sub>/m w<sub>0</sub>²), ω<sub>z</sub> = √(2U<sub>0</sub>/m z<sub>R</sub>²), z<sub>R</sub> = πw<sub>0</sub>²/λ
          </Eq>
          <p>
            Depth is conventionally quoted as a temperature, U<sub>0</sub>/k<sub>B</sub>: a
            millikelvin-deep trap holds an atom whose kinetic energy is tens of microkelvin, which
            is why the atoms must first be laser-cooled (see{' '}
            <a href="#/foundations/cooling-and-imaging">Cooling and seeing atoms</a>). For alkali
            atoms the two-level formula is refined by summing the D1 and D2 lines with weights
            1/3 and 2/3 (linear polarisation) and keeping the counter-rotating term; the board
            does this. The ground and excited states shift differently, so the qubit transition
            frequency in the trap is slightly light-shifted — small for the hyperfine pair since
            both qubit levels are in the same ground state and see almost the same shift.
          </p>
        </Primer>
        <TweezerTrap3D />
      </>
    ),
  },
  {
    id: 'selection',
    title: 'Selection rules and optical pumping',
    kicker: 'Photons carry spin. That lets circularly polarised light herd atoms into one m_F.',
    body: (
      <>
        <Plain>
          <p>
            A photon is not just a packet of energy; it also carries one unit of angular
            momentum. Circularly polarised light spins one way, so when an atom absorbs it the
            atom&rsquo;s own spin must tick one notch in that direction. Shine the light long
            enough and every atom is pushed to the end of the ladder, where it can spin no
            further. If at that point there is nothing left to absorb, the atom goes dark and
            stays put — you have sorted the whole cloud into one state. If instead there is still
            a transition available, the atom absorbs and re-emits indefinitely — it glows, and
            that is how a camera sees it.
          </p>
        </Plain>
        <Primer>
          <p>
            Electric-dipole transitions obey ΔF = 0, ±1 (not 0 ↔ 0) and Δm<sub>F</sub> = q ∈ {'{'}−1,
            0, +1{'}'} for σ<sup>−</sup>, π, σ<sup>+</sup> light, with relative strengths given by the
            squared Clebsch–Gordan coefficients |⟨F m<sub>F</sub>; 1 q | F′ m<sub>F</sub>+q⟩|².
            Spontaneous emission returns with any q. On F = 2 → F′ = 2 with σ<sup>−</sup> light the
            state |2,−2⟩ has no partner (m′ = −3 does not exist), so population accumulates there
            and stops scattering: <em>optical pumping</em> into a dark state. On F = 2 → F′ = 3
            the same stretched state still couples to |3,−3⟩, which can only decay back to |2,−2⟩:
            a closed <em>cycling transition</em> that scatters ~Γ/2 photons per second at
            saturation, ideal for fluorescence imaging.
          </p>
        </Primer>
        <SelectionRules />
      </>
    ),
  },
  {
    id: 'raman',
    title: 'Raman transitions: two photons, no excited state',
    kicker: 'How lasers drive a 6.8 GHz microwave transition without touching the excited state.',
    body: (
      <>
        <Plain>
          <p>
            The two qubit levels are separated by a microwave frequency, but lasers are far
            handier than microwaves for aiming at single atoms. The trick is to use two laser
            beams whose colours differ by exactly the qubit frequency. An atom can absorb from one
            beam and immediately emit into the other, ending up in the other qubit level, and it
            does this through a &ldquo;virtual&rdquo; visit to the excited state so brief that it
            almost never actually gets there and scatters a photon. The further both beams are
            tuned from the real excited state, the rarer the accidents — at the cost of needing
            more power.
          </p>
        </Plain>
        <Primer>
          <p>
            With both beams detuned by Δ ≫ Ω, Γ from the intermediate state and two-photon
            resonant with the qubit, adiabatic elimination of the excited state gives an effective
            two-level Hamiltonian with
          </p>
          <Eq label="Raman effective Rabi frequency and residual scattering per beam">
            Ω<sub>eff</sub> = Ω₁Ω₂ / 2Δ, Γ<sub>sc</sub> = Γ Ω² / 4Δ²
          </Eq>
          <p>
            plus a differential light shift (Ω₁² − Ω₂²)/4Δ that must be cancelled or tracked. The
            number of photons scattered during a π pulse, Γ<sub>sc</sub>·π/Ω<sub>eff</sub> =
            πΓ/2Δ, depends only on the detuning: the way to a clean gate is to detune far and
            supply enough intensity to keep Ω<sub>eff</sub> useful. Because Ω<sub>eff</sub> ∝ I,
            a focused Raman beam also gives <em>local</em> addressing — only atoms inside the beam
            rotate — which is how the paper applies single-qubit gates to chosen atoms.
          </p>
        </Primer>
        <RamanLambda />
      </>
    ),
  },
  {
    id: 'machine',
    title: 'Where this appears in the machine',
    kicker: 'Four wavelengths, four jobs, one formula.',
    body: (
      <>
        <Defense>
          <p>
            <strong>{PAPER.slm.wavelengthNm} nm</strong> (SLM and AOD tweezers): red-detuned
            ~72 nm from D2, the trapping light shift of the first two figures; T<sub>2</sub> of{' '}
            {PAPER.qubit.trapT2s} in these traps. <strong>{PAPER.lattice.wavelengthNm} nm</strong>{' '}
            (lattice): blue-detuned {PAPER.lattice.d1BlueGHz} GHz from D1 — the repulsive sign of
            the same formula — with a state-selective ~{PAPER.lattice.brightShiftMHz} MHz shift
            used for spin-to-position readout. <strong>{PAPER.shield.operateNm} nm</strong>{' '}
            (shield): tuned ~0.13 nm from the 5P<sub>3/2</sub> → 4D resonance at{' '}
            {PAPER.shield.resonanceNm} nm, it light-shifts the <em>excited</em> state by ~{PAPER.shield.lightshiftGHz} GHz
            so that imaging light aimed at one zone is off resonance for atoms in another —
            the AC Stark shift used as a shield rather than a trap. <strong>Raman at 550 GHz
            from 5P</strong>: the Λ scheme of the last figure, global Rabi frequency{' '}
            {PAPER.raman.globalRabiMHz} MHz and ~{PAPER.raman.scatteringPerPulse.toExponential(0)} scattering per
            pulse. <strong>780 nm</strong>: near-resonant D2 light for the cycling-transition
            imaging and the σ<sup>−</sup> optical pumping of the selection-rules figure.
          </p>
        </Defense>
        <div className="claim-row">
          <Claim value={PAPER.slm.wavelengthNm} unit="nm" source="tweezer wavelength" note="paper, Methods" />
          <Claim value={PAPER.raman.intermediateDetuningGHz} unit="GHz" source="Raman detuning from 5P" note="paper, Methods" />
          <Claim value={PAPER.raman.scatteringPerPulse.toExponential(0)} source="scattering per Raman pulse" note="paper, Methods" />
          <Claim value={PAPER.shield.lightshiftGHz} unit="GHz" source="1529 nm shift of 5P₃/₂" note="paper, Methods" />
        </div>
        <Note>
          Continue: <a href="#light">chapter 03, light is the toolbox</a> · <a href="#control">chapter 07, the lasers</a> ·{' '}
          <a href="#/foundations/cooling-and-imaging">Cooling and seeing atoms</a> ·{' '}
          <a href="#/foundations/rydberg">Rydberg atoms</a>.
        </Note>
        <Assumption>
          The dipole board is a two-level rotating-wave picture, valid for |Δ| ≪ ω<sub>0</sub>;
          the tweezer board relaxes that with the counter-rotating term and the D1/D2 sum but
          still ignores hyperfine structure (fine for detunings ≫ 6.8 GHz), vector and tensor
          light shifts, and any real beam aberration. The 1 μm tweezer waist is an assumption.
          The selection-rules board is a rate-equation model with no coherences or Zeeman shifts.
          The Raman board&rsquo;s single-photon Rabi frequency is not a paper number; only Δ and
          the resulting Ω<sub>eff</sub> are anchored to the paper.
        </Assumption>
      </>
    ),
  },
];
