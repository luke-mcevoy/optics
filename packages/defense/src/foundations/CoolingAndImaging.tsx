import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import { dopplerLimitK, recoilTempK } from '../physics/cooling.ts';
import { DopplerCooling } from '../viz/foundations/DopplerCooling.tsx';
import { ImagingHistogram } from '../viz/foundations/ImagingHistogram.tsx';
import { SpeedDistribution } from '../viz/foundations/SpeedDistribution.tsx';
import { MotScene3D } from '../viz/lazy.tsx';
import type { FoundationSection } from './registry.tsx';

const T_D_UK = (dopplerLimitK() * 1e6).toFixed(0);
const T_R_NK = (recoilTempK() * 1e9).toFixed(0);

export const COOLING_SECTIONS: readonly FoundationSection[] = [
  {
    id: 'hot',
    title: 'Why a hot atom is useless',
    kicker: 'At room temperature an atom crosses a tweezer in nanoseconds. It has to be a million times colder.',
    body: (
      <>
        <Plain>
          <p>
            Gas atoms at room temperature move at the speed of a rifle bullet — hundreds of metres
            per second, in random directions. A tweezer is a bowl of light a micrometre across
            and a few millikelvin deep; a room-temperature atom flies through it without noticing.
            To be held, an atom must be moving slowly enough that its kinetic energy is well below
            the depth of the bowl, which means cooling the gas from 300 kelvin to tens of
            microkelvin. That is a factor of ten million in temperature, and it is done with light.
          </p>
        </Plain>
        <Primer>
          <p>
            The kinetic energy scale is k<sub>B</sub>T; the trap depth is U<sub>0</sub>. The
            Maxwell–Boltzmann distribution gives an rms speed v<sub>rms</sub> = √(3k<sub>B</sub>T/m),
            ~290 m/s for rubidium at 300 K, ~5 cm/s at 10 μK. Two temperature landmarks recur in
            laser cooling: the Doppler limit T<sub>D</sub> = ħΓ/2k<sub>B</sub> = {T_D_UK} μK set by
            the linewidth of the cooling transition, and the recoil temperature
            T<sub>r</sub> = ħ²k²/mk<sub>B</sub> = {T_R_NK} nK set by a single photon&rsquo;s momentum.
            Tweezer experiments sit between them: Doppler-cooled atoms are loaded, then cooled
            further with sub-Doppler methods (polarisation-gradient or grey molasses, Raman
            sideband cooling) toward a few μK, and in the paper, to the motional ground state in
            some steps.
          </p>
        </Primer>
        <SpeedDistribution />
      </>
    ),
  },
  {
    id: 'doppler',
    title: 'Doppler cooling',
    kicker: 'A laser tuned slightly below resonance only pushes atoms that are moving toward it.',
    body: (
      <>
        <Plain>
          <p>
            Every absorbed photon gives the atom a tiny shove in the direction the light was
            travelling. The trick is to make atoms absorb only when they are moving <em>toward</em>{' '}
            the light. Tune the laser slightly below the atom&rsquo;s resonance: an atom flying into
            the beam sees the light Doppler-shifted up, closer to resonance, and absorbs more; an
            atom fleeing sees it shifted down, further away, and absorbs less. Surround the atoms
            with such beams from all sides and whichever way an atom moves, it is pushed back.
            Light becomes friction.
          </p>
          <p>
            The friction cannot cool forever, because each absorption and each re-emission also
            kicks the atom in a random direction. Cooling and this random heating balance at the
            Doppler limit, about {T_D_UK} microkelvin for rubidium — already a million times
            colder than the room, in about a millisecond.
          </p>
        </Plain>
        <Primer>
          <p>
            A two-level atom scatters photons at R = (Γ/2)·s/(1 + s + 4Δ²/Γ²), where s = I/I<sub>sat</sub>{' '}
            and Δ is the detuning seen by the atom, Δ<sub>lab</sub> − k·v. For two counter-propagating
            beams the net force is ħk(R₊ − R₋); expanding for small v,
          </p>
          <Eq label="Doppler friction and its equilibrium (low intensity)">
            F ≈ −αv, α = 4ħk² s (−2Δ/Γ) / (1 + (2Δ/Γ)²)²; k<sub>B</sub>T = (ħΓ/4)(1 + (2Δ/Γ)²)/(2|Δ|/Γ)
          </Eq>
          <p>
            The temperature comes from balancing the friction against momentum diffusion
            D<sub>p</sub> = 2ħ²k²(R₊ + R₋) from the randomness of absorption and emission; it is
            minimised at Δ = −Γ/2, giving T<sub>D</sub> = ħΓ/2k<sub>B</sub>. Sub-Doppler methods beat
            this by using the internal (Zeeman) structure of a real atom — the multilevel physics
            the two-level model leaves out.
          </p>
        </Primer>
        <DopplerCooling />
      </>
    ),
  },
  {
    id: 'mot',
    title: 'The magneto-optical trap',
    kicker: 'Friction slows atoms; a magnetic field gradient tells them where to gather.',
    body: (
      <>
        <Plain>
          <p>
            Cold is not the same as caught. Six cooling beams make atoms slow, but a slow atom
            still wanders and eventually leaves. To gather them in one place, add a magnetic
            field that is zero at the centre and grows outward. Because the atom&rsquo;s resonance
            shifts in a magnetic field, and because the beams are circularly polarised in opposite
            senses, an atom that strays to one side is tuned into resonance with exactly the beam
            that pushes it back toward the centre. Cooling plus a restoring force is a trap — the
            magneto-optical trap, or MOT, the starting point of essentially every cold-atom
            experiment.
          </p>
        </Plain>
        <Primer>
          <p>
            An anti-Helmholtz coil pair produces B ≈ b′(x, y, −2z) near the centre. The Zeeman
            shift μ<sub>B</sub>g<sub>F</sub>m<sub>F</sub>B/ħ adds a position-dependent term to the
            detuning of each σ<sup>±</sup> beam with opposite sign for the two members of a pair,
            so the two-beam force acquires a restoring part: F ≈ −αv − κz with
            κ = α·(g μ<sub>B</sub> b′/ħk). Typical gradients of ~10 G/cm give trap frequencies of
            tens of hertz and capture velocities of tens of m/s; a vapour-cell MOT collects the
            slow tail of the room-temperature distribution and holds 10⁶–10⁹ atoms at ~100 μK
            and ~10¹⁰ cm⁻³, limited by light-assisted collisions and reabsorption.
          </p>
        </Primer>
        <MotScene3D />
      </>
    ),
  },
  {
    id: 'imaging',
    title: 'Seeing a single atom',
    kicker: 'Count photons; beat the background; do not boil the atom while you look.',
    body: (
      <>
        <Plain>
          <p>
            An atom in a tweezer is far too small to see, but it can be made to glow. Shine
            resonant light on it and it scatters millions of photons per second in all directions;
            a good microscope objective catches a tenth of them, and a camera counts. Within a few
            milliseconds the picture is unambiguous: a bright spot means an atom, darkness means
            none. The price is that every scattered photon also kicks the atom, so a long exposure
            heats it out of the trap — which is why imaging is done with cooling light on at the
            same time.
          </p>
        </Plain>
        <Primer>
          <p>
            The signal is R·t·η<sub>col</sub>·η<sub>opt</sub>·η<sub>QE</sub> counts on a background
            of stray light and dark counts. For NA = {PAPER.imaging.na}, the geometric collection
            fraction is (1 − cos θ)/2 with sin θ = NA, about 12%. Both signal and background are
            Poisson distributed; the detection fidelity is set by the overlap of the two
            distributions at the optimal threshold, and improves exponentially with mean counts
            once μ₁ ≫ μ₀. The heating is 2E<sub>r</sub> per scattered photon (absorption plus
            emission, E<sub>r</sub> = ħ²k²/2m), so N ~ 10⁴ scattered photons deposit ~ 4 mK — more
            than a tweezer is deep. Hence continuous cooling during imaging, and hence the
            paper&rsquo;s care about imaging <em>in</em> its {PAPER.cooling.bFieldG} G bias field with
            state-dependent light shifts, where the standard cooling schemes need adjustment.
          </p>
        </Primer>
        <ImagingHistogram />
      </>
    ),
  },
  {
    id: 'machine',
    title: 'Where this appears in the machine',
    kicker: 'Load, cool, image, cool again — around the whole circuit.',
    body: (
      <>
        <Defense>
          <p>
            The cycle begins with a MOT of ⁸⁷Rb in the glass cell, followed by{' '}
            {PAPER.instruments.molasses} — a sub-Doppler scheme on the D1 line that reaches a few
            μK — and loading into the {PAPER.slm.wavelengthNm} nm SLM tweezers with ~{PAPER.loadingPct}%
            occupation before rearrangement (guide, chapter 05). Fluorescence imaging uses the
            {' '}{PAPER.instruments.objective} objective and the {PAPER.imaging.camera}. Mid-circuit
            readout images atoms in the readout zone while other zones are protected by the
            1529 nm shield (guide, chapter 09); because the whole experiment runs in a{' '}
            {PAPER.cooling.bFieldG} G field, the paper implements cooling during imaging in that
            field. Between rounds, atoms that were measured are recooled and reused, and fresh
            atoms are drawn from the reservoir zone — the continuous-operation loop of chapter 14.
          </p>
        </Defense>
        <div className="claim-row">
          <Claim value={PAPER.imaging.na} source="imaging NA" note="paper, Methods" />
          <Claim value={PAPER.loadingPct} unit="%" source="initial tweezer loading" note="paper, Methods" />
          <Claim value={PAPER.cooling.bFieldG} unit="G" source="bias field during operation" note="paper, Methods" />
          <Claim value={T_D_UK} unit="μK" source="Rb Doppler limit ħΓ/2k_B" note="standard (Steck)" />
        </div>
        <Note>
          Continue: <a href="#slm">chapter 05, holding a hundred atoms</a> · <a href="#readout">chapter 09, reading a bit</a> ·{' '}
          <a href="#/foundations/light-and-atoms">What light does to an atom</a>.
        </Note>
        <Assumption>
          All boards use the two-level, low-intensity Doppler theory with ⁸⁷Rb D2 constants; the
          Langevin ensemble is 1D. Sub-Doppler cooling (the paper&rsquo;s grey molasses) is
          described, not simulated. The MOT scene is a schematic damped-oscillator model in
          arbitrary units, not a solution of the real force field. The imaging budget&rsquo;s optics
          transmission, quantum efficiency and background rate are assumptions, marked in the
          caption; the NA is the paper&rsquo;s.
        </Assumption>
      </>
    ),
  },
];
