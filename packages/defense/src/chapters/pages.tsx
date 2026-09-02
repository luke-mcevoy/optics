import type { ReactNode } from 'react';
import { Assumption, Claim, Note } from '../components/Claim.tsx';
import { Eq, Sym } from '../components/Eq.tsx';
import { Defense, Plain, Primer } from '../components/Voice.tsx';
import { PAPER } from '../data/paper.ts';
import { AODShuttle } from '../viz/AODShuttle.tsx';
import { Apparatus3D } from '../viz/Apparatus3D.tsx';
import { CameraMeasurement } from '../viz/CameraMeasurement.tsx';
import { AtomLevels } from '../viz/AtomLevels.tsx';
import { BelowThreshold } from '../viz/BelowThreshold.tsx';
import { BlochDrive } from '../viz/BlochDrive.tsx';
import { BlockadeDynamics } from '../viz/BlockadeDynamics.tsx';
import { CodePrimer } from '../viz/CodePrimer.tsx';
import { MachineCycle } from '../viz/MachineCycle.tsx';
import { LogicAndMagic } from '../viz/LogicAndMagic.tsx';
import { MagicPlateau } from '../viz/MagicPlateau.tsx';
import { Instrument3D } from '../viz/Instrument3D.tsx';
import { Processor } from '../viz/Processor.tsx';
import { QubitPrimer } from '../viz/QubitPrimer.tsx';
import { RamanStark } from '../viz/RamanStark.tsx';
import { RydbergBlockade } from '../viz/RydbergBlockade.tsx';
import { SLMHologram } from '../viz/SLMHologram.tsx';
import { SpinToPosition } from '../viz/SpinToPosition.tsx';
import { SurfaceCode } from '../viz/SurfaceCode.tsx';
import { TeleportEntropy } from '../viz/TeleportEntropy.tsx';

export type Chapter = {
  id: string;
  num: string;
  title: string;
  kicker: string;
  body: ReactNode;
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'thesis',
    num: '00',
    title: 'The machine',
    kicker: 'A computer whose bits are individual atoms',
    body: (
      <>
        <Plain>
          <p>
            The whole idea in one paragraph. A team at Harvard and MIT built a computer whose
            memory is not a silicon chip but 448 individual atoms floating in a vacuum chamber,
            each held in place by a pinpoint of laser light. To compute, they poke the atoms with
            flashes of light; to read out the answer, they photograph them. The catch is that
            atoms are terrible at remembering — left alone, they scramble in a fraction of a
            second, and even when constantly nudged back into line they last only a second or
            two. So the real achievement is not making atoms compute. It is building a machine
            that catches and fixes the atoms&rsquo; mistakes faster than the mistakes pile up.
            This guide walks through how you would build one, piece by piece.
          </p>
        </Plain>
        <Primer>
          <p className="lede">
            You already know what a computer is: a machine that holds a state, changes that state
            with reliable operations, and can run long enough to finish a calculation. This one
            does the same three things. The state is stored in the internal energy levels of
            rubidium atoms. The operations are pulses of laser light. The hard part — the reason
            this is a Nature paper and not a freshman lab — is that those energy levels are
            analog, fragile, and continuously soaking up noise from their surroundings. The
            machine has to <em> throw entropy out </em> while it computes, or the calculation
            dissolves.
          </p>
          <p>
            The figures below are the argument, not decoration. Captions name what is drawn.
            Start with the machine itself: every zone, every atom and every laser beam in the
            paper&rsquo;s deep-circuit configuration, at one scale, running its cycle.
          </p>
        </Primer>
        <Apparatus3D />
        <div className="claim-row">
          <Claim value={PAPER.atoms} unit="atoms in the processor" source="Abstract" />
          <Claim value={`${PAPER.qec.belowThreshold}(${PAPER.qec.belowThresholdUnc})×`} unit="d=5 quieter than d=3" source="Fig. 2d, four QEC rounds" />
          <Claim value={PAPER.deep.layers} unit="reused circuit layers" source="Figs. 5–6" />
          <Claim value={PAPER.codes.maxLogicals} unit="logical qubits at once" source="Fig. 6h" />
        </div>
        <Defense>
          <p>
            The thesis, in the language of the committee: they ran a reconfigurable array of up to
            {` ${PAPER.atoms} `} {PAPER.species} atoms as a <em>logical</em> processor — not a
            bag of physical qubits — and demonstrated the pieces a universal fault-tolerant
            architecture actually needs. (1) Repeated surface-code correction, using detected atom
            loss as erasure information, is below threshold on a four-round circuit:
            {` ${PAPER.qec.belowThreshold}(${PAPER.qec.belowThresholdUnc})× `} lower error per
            round at distance 5 than at 3. (2) Transversal gates put logic on the data, so
            stabilizer measurements are entropy pumps and need only O(1) rounds per gate; lattice
            surgery puts the logic in the measurements and dies if those measurements are dirty.
            (3) Teleportation through a 3D colour code supplies a T and an H, which is how they
            get universality without violating Eastin–Knill, and the same teleportation leaves
            physical junk behind so a deep circuit can run at constant internal entropy.
          </p>
          <Note>
            Paper numbers carry a figure or Methods tag. Interactive sliders are labelled as toys.
          </Note>
        </Defense>
      </>
    ),
  },
  {
    id: 'qubit',
    num: '01',
    title: 'What a qubit is',
    kicker: 'Two energy levels, and a direction between them',
    body: (
      <>
        <Plain>
          <p>
            A normal computer bit is a light switch: off or on, 0 or 1. A quantum bit — a
            qubit — is more like a spinning globe. It can point to 0 (call that the north pole),
            to 1 (the south pole), or lean anywhere in between. A calculation is a sequence of
            precise turns of that globe. The strange part: when you finally look, you never see
            the in-between. The globe snaps to north or south, with odds set by where it was
            leaning. In this machine each globe is one atom — &ldquo;north vs south&rdquo; is its
            two closely spaced energy states (they differ in how the outer electron&rsquo;s spin
            lines up with the nucleus) — and the turns are done with
            laser pulses. The animation below is exactly this: watch a pulse of light turn one
            atom&rsquo;s globe.
          </p>
        </Plain>
        <Primer>
          <p>
            A classical bit is a switch: off or on. Physics already gave you a better object — any
            isolated two-level system. Call the lower level |0⟩ and the upper |1⟩. A general
            state is α|0⟩ + β|1⟩ with |α|² + |β|² = 1. That is one complex direction, which you
            can draw as a point on a sphere (the Bloch sphere). A <em>gate</em> is a rotation of
            that point. A <em>measurement</em> in the 0/1 basis collapses the point onto a pole
            and gives you a classical bit, with probabilities |α|² and |β|².
          </p>
          <p>
            Two qubits can be entangled: the joint state is not a product of two spheres. The
            cheapest useful entanglement is a controlled-Z (or CNOT): “if this one is 1, flip
            (or phase) that one.” Every algorithm in this paper is a recipe of single-qubit
            rotations and two-qubit phases, plus measurements.
          </p>
          <QubitPrimer />
          <p>
            Why not use a spin in a magnetic field and call it a day? Because a magnetic moment
            precesses at a rate proportional to B. Field noise is a random rotation — decoherence.
            The paper’s qubit is a <em>clock</em> transition: two states whose first-order Zeeman
            shifts cancel, so a few gauss of laboratory field does not smear the sphere.
          </p>
        </Primer>
        <BlochDrive />
        <Defense>
          <p>
            Encoding: 5S<sub>1/2</sub> hyperfine clock states, <Sym>m_F = 0</Sym>, splitting
            6.8 GHz, <Sym>T<sub>2</sub> &gt; 1 s</Sym> (Methods). Global Raman rotations at
            ~{PAPER.raman.globalRabiMHz} MHz (~{PAPER.raman.compositeUs} μs composite pulses);
            local Raman through a second AOD pair. Entangling gate: 270 ns Rydberg CZ.
            “Logical qubit” later means many of these physical qubits tied together by a code.
            Do not confuse the two.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'rubidium',
    num: '02',
    title: 'The atom',
    kicker: 'One loose outer electron, two useful sizes',
    body: (
      <>
        <Plain>
          <p>
            Step one of the build: pick your atom. They chose rubidium, a soft silvery metal in
            the same chemical family as sodium. Atoms of one element are all perfectly identical,
            which is a luxury no chip factory has — every bit in this computer is exactly the
            same, with zero manufacturing defects. A rubidium atom has one loosely held outer
            electron, and that electron is the moving part of the whole machine. It has two
            useful modes. Normally it hugs the atom tightly: compact, calm, good for storing
            information. Hit it with the right laser and it balloons out to several hundred
            times its size — big enough to make its presence felt by a neighbouring atom across
            the gap. Small means memory; puffed up means talking to the neighbours. The figure
            below shows both sizes.
          </p>
        </Plain>
        <Primer>
          <p>
            Rubidium-87 is an alkali: a closed shell plus one 5s electron. That electron is a
            standing wave around the nucleus — a probability cloud, not a planet. Start the board
            on <em>1. Ground atom</em>. Gold speck = nucleus. Blue fog = electron. Each dot is
            one Monte Carlo sample of |ψ|². Then open <em>4. Both, true scale</em>. The ground
            cloud collapses to a spark inside a much larger Rydberg cloud. Promoting the electron
            to n ≈ 53 makes the atom fat enough to feel its neighbour several microns away.
            That is the switch they use for entanglement.
          </p>
        </Primer>
        <AtomLevels />
        <Defense>
          <p>
            Nuclear spin <Sym>I = 3/2</Sym> splits 5S<sub>1/2</sub> into F = 1 and F = 2. The
            qubit is |F=1, m_F=0⟩ ↔ |F=2, m_F=0⟩. The experiment runs at a finite bias field
            of 8.6 G — needed to resolve the Zeeman levels for qubit control and for imaging in
            the field — and the m_F = 0 clock states stay first-order insensitive to it. Their
            coherence in the 852 nm traps is 1–2 s <em>with dynamical decoupling</em> (T₂ &gt; 1 s);
            left undriven they dephase far faster. Optical workhorse lines: D2 780.241 nm, D1 794.978 nm
            (standard values; the paper assumes them). The Rydberg climb is a different pair:
            420 nm + 1013 nm to n = {PAPER.rydberg.n}.
          </p>
          <Eq label="clock subspace">
            H/ℏ = (ω<sub>hfs</sub>/2) σ<sub>z</sub> + (1/2) Ω<sub>R</sub>(t) [cos φ σ<sub>x</sub> + sin φ σ<sub>y</sub>]
          </Eq>
          <Assumption>
            Hydrogenic 5s is a stand-in. Real Rb 5s has quantum defect n* ≈ 1.87 and is tighter.
            Computational subspace is the two clock states; other hyperfine levels are leakage.
            At 8.6 G they sit ~6 MHz away, comparable to the 4.6 MHz Rydberg Rabi frequency.
          </Assumption>
        </Defense>
      </>
    ),
  },
  {
    id: 'light',
    num: '03',
    title: 'Light is the toolbox',
    kicker: 'One laser trick traps atoms, turns qubits, and shields bystanders',
    body: (
      <>
        <Plain>
          <p>
            You cannot pick up an atom with metal tweezers, so everything in this machine is done
            with light. Laser light tuned slightly away from the atom&rsquo;s natural colour is
            not absorbed — instead it gently pushes and squeezes the atom&rsquo;s energy levels.
            That one trick, used three ways, is the entire toolbox. Focus the light to a pinpoint
            and an atom falls in and stays: a trap. Shine two carefully mismatched beams and the
            qubit&rsquo;s globe rotates: a gate. Flood a region with a third colour and the atoms
            there go deaf to stray light meant for their neighbours: a shield. Everything you
            will see from here on — holding, moving, computing, protecting — is laser light doing
            one of these three jobs.
          </p>
        </Plain>
        <Primer>
          <p>
            Shine light on an atom far from resonance and you do not absorb photons so much as
            you shift energies (the AC Stark effect) and, if you use two tones whose difference
            matches the clock splitting, you rotate the qubit (a Raman transition). Same
            second-order perturbation theory you used in atomic physics: amplitude to be in the
            excited state is Ω/2Δ, energy shift is Ω²/4Δ, scattering is Γ Ω²/4Δ². Red-detuned
            (Δ &lt; 0) makes a high-field-seeking potential — a trap. Two Raman legs with
            unequal Ω make a differential shift of |0⟩ versus |1⟩, which looks like an extra
            magnetic field along z.
          </p>
        </Primer>
        <RamanStark />
        <Eq label="far-detuned two-level estimates (sliders use ordinary frequencies; treat as toys for mechanism)">
          Ω<sub>eff</sub> = Ω<sub>1</sub>Ω<sub>2</sub> / 2Δ, &nbsp; δ<sub>AC</sub> = (Ω<sub>1</sub>² − Ω<sub>2</sub>²) / 4Δ, &nbsp; Γ<sub>sc</sub> = Γ Ω² / 4Δ²
        </Eq>
        <Defense>
          <p>
            Intermediate Raman detuning raised to {PAPER.raman.intermediateDetuningGHz} GHz so
            scattering falls as 1/Δ². Measured {PAPER.raman.scatteringPerPulse.toExponential(0)}
            per SCROFULOUS pulse. Global path plus local AOD path share a 6.8 GHz IQ reference.
            A separate Stark shift is the 1,529.49 nm shield: ~{PAPER.shield.powerW} W,
            ~{PAPER.shield.lightshiftGHz} GHz on 5P<sub>3/2</sub>, so imaging light in the
            neighbouring readout zone does not talk to stored qubits. Ground-state polarizability
            at that detuning is ~2×10<sup>−5</sup> of the 5P shift (Extended Data Fig. 4).
            They knife-edge the Gaussian tail; stray 1,529 nm ruins imaging. The shield slider
            interpolates that one operating point; the paper’s spectrum has Autler–Townes
            structure the slider does not contain.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'rydberg',
    num: '04',
    title: 'How two atoms talk',
    kicker: 'A ballooned atom blocks its neighbour. That block is an if–then gate.',
    body: (
      <>
        <Plain>
          <p>
            Now the key trick: how do two atoms run an &ldquo;if&ndash;then&rdquo;? Puff one atom
            up into its balloon state and it changes the rules for its neighbour: the
            neighbour&rsquo;s laser stops working, because the first atom&rsquo;s presence shifts
            the exact energy the laser was aimed at. It is like two people trying to inflate
            balloons inside one phone booth — once the first balloon fills the space, the second
            cannot inflate. &ldquo;B does the thing only if A did not&rdquo; is a conditional
            operation: a logic gate, the quantum counterpart of a transistor. Each one takes
            about a quarter of a millionth of a second. The two figures below show the energy
            picture, and then the actual moment-by-moment tug-of-war between the two atoms while
            the laser pulse plays.
          </p>
        </Plain>
        <Primer>
          <p>
            Two ordinary 5s atoms a few microns apart barely notice each other. Promote one
            electron to a high-n Rydberg orbital and the atom becomes a large, polarizable dipole.
            Two such atoms interact with a van der Waals potential C<sub>6</sub>/R<sup>6</sup>.
            If that shift is larger than the driving Rabi frequency, the second atom cannot
            absorb the same laser — <em>blockade</em>. You do not need the electron clouds to
            overlap; you need the pair-state energy to miss the laser. Drive the pair with a
            pulse designed for isolated atoms and the blocked pair picks up a different phase
            than two independent atoms would: a conditional phase, a CZ gate. (The textbook
            version is the Jaksch π–2π–π sequence, which needs each atom addressed separately;
            with one global pulse a plain 2π does not close, so the paper uses a single
            time-optimal pulse with a shaped laser phase — same blockade, one pulse, 270 ns.)
          </p>
        </Primer>
        <RydbergBlockade />
        <BlockadeDynamics />
        <Defense>
          <p>
            Time-optimal two-photon pulse, 270 ns, 420 + 1013 nm, 4.8 GHz red of the
            intermediate state, n = {PAPER.rydberg.n}. Nominal CZ 99.6%. Three leakages:
            loss (partner sees a dark atom, gate off); hyperfine leakage (6 MHz vs 4.6 MHz
            Ω); Rydberg-P leftovers (~0.07%, &gt;100 μs) that blockade later gates. Waiting
            100 μs instead of 4 μs between benchmarking pulses takes CZ from 99.3% to 99.5%.
            Surface-code motion already waits several hundred μs, by which time a leftover
            Rydberg atom has either decayed to the ground state or been expelled from the
            tweezer — landing as a computational-subspace error, a hyperfine leakage, or a
            loss, rather than the many-body &ldquo;avalanche&rdquo; errors seen in dense arrays.
          </p>
          <Assumption>
            The slider’s C₆ = n¹¹ and “CZ phase” are a unitless toy. They are not 53S
            spectroscopy and not the 270 ns waveform.
          </Assumption>
        </Defense>
      </>
    ),
  },
  {
    id: 'slm',
    num: '05',
    title: 'How you hold a hundred atoms',
    kicker: 'A hologram is a chip. They reprint it every time the layout changes.',
    body: (
      <>
        <Plain>
          <p>
            You need hundreds of those pinpoint traps, arranged in exact patterns. Building
            hundreds of separate lasers would be absurd, so they use one laser and one
            programmable screen. The screen subtly delays different parts of the beam passing
            through it, and a lens then focuses the sculpted beam into hundreds of bright
            pinpoints at once — a hologram whose &ldquo;image&rdquo; is a grid of tweezers, one
            atom per dot. Want a different layout? Display a different pattern on the screen. It
            is a projector, except the picture it projects is the computer&rsquo;s motherboard.
            In the figure below you can click to add a trap and watch the required screen pattern
            change.
          </p>
        </Plain>
        <Primer>
          <p>
            A tightly focused red-detuned laser is an optical tweezer: the AC Stark shift is
            deeper at the focus, so the atom sits there. One tweezer, one atom. A hundred
            tweezers means a hundred foci. A spatial light modulator paints a phase pattern
            φ(x,y) on a single 852 nm beam; a lens Fourier-transforms that field; the foci
            appear in the focal plane. Click the |E|² map to add a trap. You are editing the
            hologram, not dragging atoms by hand.
          </p>
        </Primer>
        <SLMHologram />
        <Eq label="ideal phase-only Fourier construction">
          E(u,v) = Σ<sub>k</sub> exp[−i 2π (x<sub>k</sub>u + y<sub>k</sub>v)], &nbsp; φ = arg E, &nbsp; I<sub>f</sub> = |ℱ[e<sup>iφ</sup>]|²
        </Eq>
        <Defense>
          <p>
            Hamamatsu X13138-02, array on the zeroth order, entangling/storage depths set to
            half of readout/reservoir in the hologram target. Each new code layout is a new
            printed chip: SLM inhomogeneity showed up as cooling nonuniformity and echo
            failure. Holography is in the error budget.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'aod',
    num: '06',
    title: 'How you move them mid-circuit',
    kicker: 'A claw machine made of light rearranges the wiring on the fly',
    body: (
      <>
        <Plain>
          <p>
            Here is the feature that makes this machine special: it physically carries its atoms
            around in the middle of a calculation. A second set of steerable tweezers works like
            an arcade claw machine — it reaches in, lifts a chosen row of atoms out of their
            parking spots, glides them across the chip, and sets them down next to new partners.
            The steering is done by sound waves inside a crystal, which bend the laser beam by an
            angle you can dial up and down with radio signals — no moving mirrors, so it is fast
            and perfectly repeatable. Whichever atoms need to interact next simply get picked up
            and placed side by side. In most other quantum computers, each qubit is soldered to
            its spot forever; this one rearranges its own wiring on the fly.
          </p>
        </Plain>
        <Primer>
          <p>
            An acousto-optic deflector is a radio-driven diffraction grating. Tone frequency
            f sets deflection angle θ = λf / v. Two crossed AODs give a 2D grid of moving
            tweezers. The static SLM holds the furniture; the AOD picks atoms up and carries
            them to another room of the processor — including during the algorithm. That is
            why this architecture can do transversal gates: you physically interlace two
            blocks and fire one global pulse.
          </p>
        </Primer>
        <AODShuttle />
        <Defense>
          <p>
            AA DTSX-400 pair, 852 nm. Design rule: translate, do not compress; keep X and Y
            combs incommensurate so intermodulation beats miss trap frequencies. Surface-code
            storage is interlaced so block metric matches the entangling zone — hence 165 μm
            width, not “as small as possible.”
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'control',
    num: '07',
    title: 'The whole instrument, and who plays it',
    kicker: 'Six lasers, an SLM, two AOD pairs, coils, a camera — and five signal generators on one clock',
    body: (
      <>
        <Plain>
          <p>
            Time to zoom out from the atoms to the room. On the table are six different laser
            systems, each with a job: one holds the atoms, one nudges single qubits, two flash
            together to entangle pairs, one sorts and photographs, one shields the memory. Between
            the lasers and the atoms sit the modulators that shape and steer the light — a
            liquid-crystal panel that prints the trap pattern, crystals that bend beams with sound
            — plus magnetic coils, a microscope objective and a fast camera. Who conducts it all?
            Not a processor issuing instructions one at a time. The whole program is composed in
            advance as a set of electrical waveforms, like the tracks of a multi-track recording,
            and played through five synchronized signal generators. If two tracks slip by a few
            billionths of a second, the &ldquo;note&rdquo; played on the atoms becomes a different,
            wrong operation. Press play below and watch one layer of a computation run through
            every box on the table.
          </p>
        </Plain>
        <Primer>
          <p>
            Nothing here is a conventional CPU issuing “CNOT qubit 17.” The circuit is a
            multi-channel analog waveform: trap-move voltages, Rydberg envelopes, Raman
            I and Q, local-addressing tones. If those channels disagree by tens of
            nanoseconds, the gate is a different Hamiltonian. The “compiler” is a rack of
            arbitrary-waveform generators sharing one clock, and the “instruction set” is which
            beam path is open: every physical qubit in a block sees the same light, so one
            waveform is one logical-block operation.
          </p>
        </Primer>
        <Instrument3D />
        <Defense>
          <p>
            Hardware (Methods, system overview): {PAPER.instruments.slm} SLM; {PAPER.instruments.aod}{' '}
            for moving traps and a second pair for local Raman; {PAPER.instruments.objective} objective
            onto a {PAPER.instruments.camera}; {PAPER.instruments.microwave}; {PAPER.instruments.latticeLaser}{' '}
            for the lattice; {PAPER.instruments.shieldLaser}. Raman at {PAPER.raman.intermediateDetuningGHz}{' '}
            GHz intermediate detuning ({PAPER.raman.scatteringPerPulse.toExponential(0)} scattering per
            SCROFULOUS pulse); Rydberg {PAPER.rydberg.blueNm} nm red-detuned {PAPER.rydberg.intermediateDetuningGHz}{' '}
            GHz from 5P. Extended Data Fig. 1a is the real layout; Fig. 8 is a reconstruction from the
            text.
          </p>
          <p>
            Five Spectrum AWGs, &lt;{PAPER.control.jitterNs} ns sync. Deep circuits
            {` ${PAPER.deep.circuitS} `} s. The whole waveform for every AWG except
            rearrangement is uploaded before the run; Moving, Rydberg and Raman-AOD loop one
            memory segment per layer. Looping the Raman IQ channel is complicated by the need
            to keep the 6.8 GHz phase continuous, so for simplicity the paper programs that
            waveform whole — it fills the AWG memory, and that is what caps Fig. 6 at{' '}
            {PAPER.deep.layers} layers; the reservoir is then sized to feed exactly that many
            layers, which is why chapter 08 can equally say the run ends when the reservoir
            empties. The paper names waveform streaming as the fix. A QEC round is 4.45 ms
            (2.57 ms of that is swapping ancillas). A teleportation layer is 41.9 ms,
            bottlenecked by desktop image analysis. The 4 ms cycle in Fig. 5b (repeated Rabi
            calibration on ~200 atoms) used global imaging as a fast-calibration demonstration;
            the paper expects similar speeds to be reachable in zoned operation.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'zones',
    num: '08',
    title: 'Four rooms, one processor',
    kicker: 'Gates, memory, reading, and spare atoms each get their own room',
    body: (
      <>
        <Plain>
          <p>
            The chip needs a floorplan, for one blunt reason: the different kinds of light do not
            get along. The bright light used to photograph atoms would wreck the delicate states
            of atoms that are storing data, and gate flashes would scramble innocent bystanders.
            So the array is divided into rooms — a storage room for memory, a gate room where
            atoms interact, a reading room with the camera, and a pantry of spare atoms — and the
            claw machine shuttles atoms between rooms as needed. The animation below plays one
            full working cycle: move in, flash the gates, read the helpers, and fetch a
            replacement for an atom that went missing.
          </p>
        </Plain>
        <Primer>
          <p>
            You cannot do everything to every atom at once. Rydberg light that performs a
            CZ will scramble atoms you meant to store. Imaging light that reads a bit will
            decohere neighbours. So the array is a floorplan: a room for gates, a room for
            memory, a room for measurement, a room of spare atoms. Parallel optics is the
            instruction set — every physical qubit in a logical block sees the same pulse.
          </p>
        </Primer>
        <Processor />
        <MachineCycle />
        <Defense>
          <p>
            Surface-code: 55 μm / 12-row readout, two traps per atom, six interlaced
            blocks, Rydberg tophats ~1% over 60 μm, 40 μm dark gap. Deep-circuit: 256
            atoms entangling on 8×16 over 175 μm; 128-atom readout; 196-atom reservoir;
            shield waist matched to 35 μm of storage. Loading 75% by D1 grey molasses,
            then AOD compaction. Fig. 6 ends when the reservoir empties — its occupancy is
            taken from one global image before the circuit and then tracked in software,
            because the local imaging beams do not cover it. The reservoir was sized to match
            the 27 layers that fit in the Raman AWG memory (chapter 07), so the two depth
            limits are the same number seen from two sides.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'readout',
    num: '09',
    title: 'How you read a bit and keep the atom',
    kicker: 'Spin becomes a position. A camera counts photons. A hole becomes an erasure.',
    body: (
      <>
        <Plain>
          <p>
            Reading an atom is delicate: you want the answer without losing the atom, because you
            will need it again. The trick has three moves. First, force the fence-sitter to
            commit — an internal shuffle makes the atom settle into a definite 0 or 1. Second,
            turn that answer into a position: a tweezer slides the atom about two thousandths of
            a millimetre to one side, but only if its answer was &ldquo;1.&rdquo; Third, take a
            photograph. The bit is now simply which parking spot the atom sits in: home spot
            means 0, shifted spot means 1, and both spots empty means the atom is gone. That last
            case is surprisingly precious. Knowing <em>where</em> something went wrong makes the
            mistake roughly twice as easy to fix as a mistake hiding in an atom that looks fine.
          </p>
        </Plain>
        <Primer>
          <p>
            A projective measurement is not a special opcode. It is an irreversible
            correlation with a large environment, then a classical record. Here the
            environment is the radiation field, and the record is a CMOS frame.
          </p>
          <p>
            The usual alkali trick destroys the atom: push one spin state out of the
            trap and photograph what remains. You learn 0 versus 1 and you have lost
            the qubit. This paper needs the atom back — for reuse, and because a
            missing atom is information (an erasure), not a random 0. So they do three
            things, in this order.
          </p>
          <p>
            <em>First, kill the superposition.</em> Optical pumping maps the clock
            states onto stretched states: |F=2, m<sub>F</sub>=0⟩ (|1⟩) is pumped
            σ<sub>−</sub> into |2,−2⟩; |F=1, m<sub>F</sub>=0⟩ (|0⟩) is transferred
            into |2,+2⟩. That step already chooses a world. The camera never sees a
            Bloch vector.
          </p>
          <p>
            <em>Second, turn that choice into a position.</em> A 795 nm lattice pins
            the bright stretched state. An AOD tweezer walks the dark one ~2 μm. The
            bit is now which well is occupied — or neither, if the atom is gone.
          </p>
          <p>
            <em>Third, photograph both wells.</em> 780 nm light — the same beams that
            cool — drives the cycling transition. The atom scatters. A 0.65-NA
            objective collects a geometric fraction (1 − cos θ)/2 of 4π onto a
            Hamamatsu ORCA-Quest, chosen for fast electronic readout. Software sums
            two regions of interest. Occupied / empty / both-empty is |0⟩ / |1⟩ /
            loss. Two spots 2 μm apart are separated by nearly three resolution elements
            (Rayleigh criterion 0.61 λ/NA ≈ 0.73 μm), so they do not merge.
          </p>
        </Primer>
        <SpinToPosition />
        <CameraMeasurement />
        <Eq label="geometric collection of an air objective, and the Rayleigh resolution limit on the camera">
          η = (1 − cos θ)/2, &nbsp; θ = arcsin(NA), &nbsp; d = 0.61 λ / NA
        </Eq>
        <Defense>
          <p>
            795 nm σ<sub>−</sub> lattice, 50–200 GHz blue of D1; |2,−2⟩ dark (this is
            |1⟩, and the AOD moves it), |2,+2⟩ bright and pinned (this is |0⟩),
            ~6 MHz light shift. Pump/Raman into those stretched states, 100 μs ramp,
            2 μm / 500 μs AOD walk, then a conventional fluorescence image.
            Imaging optics: 0.65-NA Special Optics objective onto {PAPER.imaging.camera}.{' '}
            {PAPER.lattice.bitFlipPct}({PAPER.lattice.bitFlipUnc})% bit-flip,{' '}
            {PAPER.lattice.lossPct}({PAPER.lattice.lossUnc})% loss; error lives on
            the dark state (0.87% vs 0.05%). Mid-circuit cooling: 1D PGC in finite B
            by detuning the two σ beams by twice the Zeeman splitting (rotating frame
            cancels B), then EIT ~80 MHz blue of F=2→F′=2. Re-pump: 24 Raman-assisted
            cycles. The 1,529 nm shield exists so this 780 nm light does not talk to
            qubits parked in the storage zone one zone over.
          </p>
          <Assumption>
            Photon counts on the camera board are a teaching Poisson model. The paper
            shows a site-averaged imaging histogram (Extended Data Fig. 3c) but quotes no
            photoelectrons-per-frame number, and the &ldquo;two regions of interest, occupied /
            empty / both-empty&rdquo; description above is our reading of the method, not a
            procedure the paper spells out. NA, λ, camera, 2 μm split, and the 0.46(4)% /
            0.24(2)% errors are paper numbers. Collection η ignores coatings and quantum
            efficiency.
          </Assumption>
        </Defense>
      </>
    ),
  },
  {
    id: 'why-code',
    num: '10',
    title: 'Why one atom is not a computer',
    kicker: 'You cannot copy a qubit. You can hide it in a pattern.',
    body: (
      <>
        <Plain>
          <p>
            One atom is too flaky to trust: somewhere between one and five operations in a
            thousand go wrong, and a
            useful program needs billions of operations. Ordinary computers survive flakiness by
            copying — store the bit three times and take a vote. But a hard law of quantum
            mechanics says you cannot photocopy a qubit. The workaround, invented in the 1990s:
            do not store the bit in any single atom. Hide it in a pattern shared across dozens of
            atoms, so that no individual atom knows the secret — only the group does. Then you
            never ask &ldquo;atom 7, are you a 0?&rdquo; (which would destroy the stored
            information). Instead you ask small committees of atoms, &ldquo;do you all still
            agree?&rdquo; A &ldquo;no&rdquo; pinpoints a mistake without ever revealing the
            secret itself.
          </p>
        </Plain>
        <Primer>
          <p>
            A physical qubit has an error rate of order 10<sup>−3</sup> per operation
            here. An algorithm you care about wants 10<sup>−10</sup> or worse. Classical
            computers copy bits and vote. The no-cloning theorem forbids that for
            unknown quantum states. The way out, discovered in the mid-1990s, is to
            store the information in the <em>correlations</em> among many physical
            qubits — an error-correcting code. You never ask “is atom 7 a 0?” You ask
            “do these four neighbours still agree on their parity?” That question is a
            <em>stabilizer</em> measurement: it extracts a syndrome bit and, if you
            designed it right, does not collapse the logical information.
          </p>
          <CodePrimer />
          <p>
            Distance d means it takes at least d single-atom mistakes to fake a logical
            flip. If the physical error probability p is below a threshold p_th, the
            logical error scales roughly as (p/p_th)<sup>(d+1)/2</sup> — making the
            block bigger makes the encoded bit quieter. “Below threshold” is the
            experimental sentence “d = 5 is quieter than d = 3 on this circuit.”
          </p>
        </Primer>
        <Defense>
          <p>
            Surface code: 2D lattice, X- and Z-type plaquettes, used in Figs. 1–3 (run as the
            XZZX rotated variant — Y(π/2) on one data sublattice makes it equivalent to the
            CSS rotated surface code, Extended Data Fig. 6c). Colour codes appear later for magic ({PAPER.codes.steane},{' '}
            {PAPER.codes.reedMuller}) and high-rate blocks ({PAPER.codes.tesseract}).
            Atom loss is an erasure if you detect it: a distance-d code corrects
            (d−1)/2 unknown Paulis but up to d−1 known-location erasures. They detect
            loss late (final readout) and the decoder enumerates when it could have
            happened.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'qec',
    num: '11',
    title: 'Proof that bigger is quieter',
    kicker: 'A bigger code makes fewer mistakes — if you tell the decoder which atoms vanished',
    body: (
      <>
        <Plain>
          <p>
            This is the paper&rsquo;s headline result. Hiding one bit across many atoms only pays
            off if bigger patterns really are safer — otherwise you are spending extra atoms for
            nothing. Theory says bigger wins only when each atom&rsquo;s error rate is below a
            break-even point, called the threshold. So the experiment ran two sizes of pattern
            through repeated rounds of error-fixing and compared them: the bigger pattern made
            mistakes 2.1 times less often. That single comparison is why this paper matters —
            it means scaling up makes things better, not worse. One ingredient proved vital:
            telling the error-fixer which atoms had physically vanished (the photographs show
            empty parking spots), because a known hole is far easier to repair than an error
            hiding in an atom that looks fine.
          </p>
        </Plain>
        <Primer>
          <p>
            Look at the lattice. Each gold knot is one physical qubit. Crimson is a
            missing atom. If you pretend the hole was a 0, the neighbouring parity
            checks fight each other and flicker forever. If you multiply those checks
            into a “supercheck” around the hole, they commute again and you still have
            a syndrome. That is erasure-aware decoding, in one picture.
          </p>
        </Primer>
        <SurfaceCode />
        <BelowThreshold />
        <Defense>
          <p>
            Distance-5 data block held static in the entangling zone; a fresh 6×6 ancilla block
            each round (up to five), used blocks parked in storage and all read out together at
            the end — so loss information arrives as <em>delayed</em> erasure.
            Hybrid decoder: delayed-erasure MLE (Stim model updated per shot, CMA-ES
            tuned) plus a net trained on 200 million {'{0,1,loss}'} shots, ensembled,
            fine-tuned, geometric-mean confidences 0.4 / 1. Result: 0.62(3)% LEPR at
            d=5 vs 1.33(4)% at d=3 — {PAPER.qec.belowThreshold}({PAPER.qec.belowThresholdUnc})×,
            no postselection. Loss information plus machine learning is a 1.73(13)× win over a
            bare MLE that reads lost atoms as |0⟩ (the MLE alone gains 1.24(5) → 1.69(8) in the
            d=3/d=5 ratio from loss information). No-loss
            shots fall toward ~0.1% LEPR (p³-ish; ~half the budget is loss). &gt;80%
            of leakage is atom loss. Global coherent injections Zeno-project; logical
            coherent piece is exponentially small in d. Detector histogram matches
            uncorrelated Pauli+loss Stim; no burst errors.
          </p>
          <Assumption>
            “Below threshold” is this four-round circuit, not a published p_th.
            Stim says the d=5/d=3 ratio can worsen ~15% at many rounds and ~10% with
            one transversal gate per round. The toy p<sup>(d+1)/2</sup> card is not
            Fig. 2d.
          </Assumption>
        </Defense>
      </>
    ),
  },
  {
    id: 'logic',
    num: '12',
    title: 'Doing logic on a coded bit',
    kicker: 'Either the data do the gate, or the measurements do',
    body: (
      <>
        <Plain>
          <p>
            You now have protected, encoded bits. How do you compute with them without breaking
            the protection? Here the claw machine becomes a superpower. Because atoms can be
            carried, you can pick up an entire encoded block, lay it on top of another block so
            the atoms pair off, and fire one flash of light: every pair does its gate at the same
            instant, and a mistake on any one atom stays on that atom instead of spreading
            through the block. Machines whose qubits are bolted in place cannot do this — they
            must slowly stitch neighbouring blocks together through many rounds of measurements.
            The paper compares both ways head to head on the same hardware and shows the stitching
            method is far less forgiving when measurements are imperfect.
          </p>
        </Plain>
        <Primer>
          <p>
            You now have a quiet encoded bit. How do you entangle two of them? Two
            philosophies. <em>Transversal:</em> physically pair every data atom of
            block A with one of block B and fire one global CZ. The logic sits on the
            data. Later stabilizer checks only mop up the entropy that gate created.
            <em>Lattice surgery:</em> grow a seam of extra atoms between the blocks
            and measure a joint logical operator. The measurements <em>are</em> the
            gate. If those measurements are wrong, the logic is wrong — so textbooks
            demand d rounds. That is a different machine.
          </p>
        </Primer>
        <LogicAndMagic />
        <Eq label="logical error depends on entropy, not a single fidelity (Methods)">
          1 − F<sub>L</sub> ∝ [ (P<sub>det</sub> + N ΔP<sub>det</sub>)<sup>(d+1)/2</sup> ] / N
        </Eq>
        <Defense>
          <p>
            Injected ancilla measurement error kills surgery and barely touches
            transversal. Optimum ~3 transversal CNOTs per QEC round. Surgery was run with
            only two stabilizer rounds (fewer than d = 5), so they add error detection on the
            seam ancillas to compensate; their Stim simulations put the optimum at ~3 rounds
            for this circuit (Extended Data Fig. 8d). The Bloch / T-spacing graphic on that
            board is a cartoon of Solovay–Kitaev-style densification, not the
            paper’s reconstructed angles.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'universal',
    num: '13',
    title: 'Every rotation you might want',
    kicker: 'A theorem forbids getting every move for free. Teleportation gets around it.',
    body: (
      <>
        <Plain>
          <p>
            There is a subtle gap between &ldquo;can do gates&rdquo; and &ldquo;can compute
            anything.&rdquo; The safe, protected gates from the last chapter only turn the
            qubit&rsquo;s globe in clean 90-degree clicks. Universal computing needs one more
            move: a 45-degree click. And a mathematical theorem says no error-correcting code
            hands you every move for free — something has to give. The escape hatch: manufacture
            a special helper block of atoms prepared in an exotic state, then teleport your data
            through it. The data comes out the other side having received exactly the forbidden
            45-degree turn. The figure below shows the fingerprint of that specialness: rotate
            every atom and only the special 3D pattern survives at 45 degrees.
          </p>
        </Plain>
        <Primer>
          <p>
            The gates you can do “in parallel, atom by atom, without looking” are
            called transversal. If those already included every rotation, a slightly
            wrong physical pulse would be a slightly wrong logical pulse — unprotected.
            That is the Eastin–Knill theorem. The way out is to allow measurement.
            Some 3D codes have a transversal T (a 45° rotation). Prepare a block in
            |T⟩, entangle, measure, feed forward: you teleport a Hadamard. The set
            {' {H, T, CNOT} '} generates a dense subgroup of SU(2) — any single-qubit
            rotation to exponential accuracy with a sequence whose length grows only
            polylogarithmically in 1/ε (Solovay–Kitaev). You have a universal computer
            made of digital pieces.
          </p>
        </Primer>
        <MagicPlateau />
        <Defense>
          <p>
            Reed–Muller {PAPER.codes.reedMuller}: extra plateau at 45° only if the
            block is properly entangled and stabilizer signs are +1. 2D codes revive
            at 90°; bare qubits at 180°. |T_L⟩ is an eigenstate of
            (X<sup>⊗n</sup> + Y<sup>⊗n</sup>)/√2 — magic requires in-block
            entanglement. Error-corrected CHSH: {PAPER.codes.chsh}, saturating
            Tsirelson. Circuit is a stripped 15-to-1 distillation (inner surface
            codes replaced by physical qubits). Without feedforward the teleport
            randomly synthesizes 2<sup>N−1</sup> angles; they reconstructed N ≤ 3
            in software. Fig. 4a is a global-phase sweep, not optical spectroscopy.
          </p>
        </Defense>
      </>
    ),
  },
  {
    id: 'entropy',
    num: '14',
    title: 'Running without heating up',
    kicker: 'Move the information. Leave the dirt on the atom you are about to reset.',
    body: (
      <>
        <Plain>
          <p>
            A computer that runs for a long time cannot keep its original atoms — they get lost,
            jostled, and scrambled. This machine&rsquo;s answer is a pit stop. It keeps
            teleporting the information onto fresh blocks of atoms and throws the used blocks
            away: measure them, re-cool and reset them, top up any that went missing from the
            pantry. The information never
            stops moving forward; the accumulated mess stays behind on atoms that are about to be
            reset anyway, like swapping worn tyres mid-race while the car keeps going. In the
            deepest runs they replayed the same choreography 27 times over about a second — an
            eternity by atom standards — and the health of the encoded information stayed flat
            instead of decaying.
          </p>
        </Plain>
        <Primer>
          <p>
            Every gate dumps heat: bit flips, leaked population, hotter motion,
            missing atoms. Stabilizer checks remove the digital part of that heat.
            The rest you can only fix by touching the atom — image, cool, refill,
            re-pump. If the algorithm itself teleports the logical state onto a
            fresh block, then measuring the old block is free: the calculation
            continues, the junk stays behind. That is a computer that can run
            indefinitely, limited by whether you still have spare atoms.
          </p>
        </Primer>
        <TeleportEntropy />
        <Defense>
          <p>
            Groups A/B alternate: encode A, entangle in space, transversal gate
            with B in time, measure B, store A, reinit B from the reservoir.
            32 Steane {PAPER.codes.steane} blocks, up to {PAPER.deep.layers} layers.
            Stabilizer error flat vs cycle. Logical cluster correlators persist;
            physical-error correlators die — until the reservoir empties.
            Same death of physical correlations on {PAPER.codes.tesseract}; in-block
            permutation CNOTs (relabelings) extend logical range. Up to{' '}
            {PAPER.codes.maxLogicals} d=4 logicals live at once. CNN decoder,
            window 3, &gt;100 M shots × 4 models. Pauli-frame feedforward is
            software.
          </p>
          <Assumption>
            Several Fig. 6 panels use confidence postselection (acceptance as low
            as 0.24% on a 2D-cluster cut) and truncate when filling fails. Constant
            entropy is for the internal state of surviving, accepted shots — not an
            unconditioned 27-layer logical fidelity.
          </Assumption>
        </Defense>
      </>
    ),
  },
  {
    id: 'outlook',
    num: '15',
    title: 'What would make it a computer',
    kicker: 'The Hamiltonians are the right ones. The constants are still too large.',
    body: (
      <>
        <Plain>
          <p>
            So — is it a computer? The full loop now demonstrably works: trap atoms with light,
            carry them around, run gates, photograph the helpers, fix the mistakes, swap in fresh
            atoms, repeat. That end-to-end loop, running below the break-even point where bigger
            patterns beat smaller ones, is what this paper proved for the first time in this
            platform. What the machine is not, yet, is quiet enough: it sits about a factor of
            two on the good side of the break-even line, and the authors estimate the basic
            operations need to get three to five times quieter still before really long programs
            become cheap to protect. They publish their punch list — stronger lasers here, better
            vacuum there, streaming control electronics instead of pre-recorded — and nothing on
            it requires new physics. That is the paper&rsquo;s closing claim: the remaining work
            is engineering.
          </p>
        </Plain>
        <Primer>
          <p>
            You have now seen the whole object. Atoms hold clock qubits. Light
            rotates them, traps them, and, for 270 ns at a time, entangles them.
            A hologram and a pair of deflectors are the memory and the data bus.
            A code hides each logical bit in a pattern. Measurement throws entropy
            out. Teleportation is both a useful gate and a reset. That is a
            computer, in the same sense a transistor array is a computer: the
            architecture exists. What remains is to make each physical operation
            quieter so the encoded bits reach algorithmically useful error rates.
          </p>
        </Primer>
        <Defense>
          <p>
            About 2× below the relevant thresholds today. Path they write down:
            Raman to 2.5 THz and 99.99%; movement loss 1% → 0.2%; vacuum 0.6% →
            &lt;0.01% at 4 ms; 4× Rydberg power (4.8→9.6 GHz, 270→135 ns) to
            ~0.15% CZ. That package is ~8× below threshold, where a few hundred
            qubits per block can reach ~10<sup>−10</sup>. Leftovers: stream
            waveforms instead of filling AWG memory; refill the reservoir
            continuously (a separate 3,000-atom apparatus already reloads). ML
            decoding is ~1 μs/shot on a GPU and not yet a scalable algorithm.
          </p>
          <p className="lede close">
            The physics required for a neutral-atom fault-tolerant computer is
            the physics that has been run. The rest is making the prefactors
            smaller.
          </p>
          <p className="cite">
            {PAPER.cite}; published online 10 November 2025. Open access, DOI {PAPER.doi}.
            First authors Dolev Bluvstein and Alexandra A. Geim; senior authors Madelyn Cain
            and Mikhail D. Lukin, with Susanne F. Yelin, Markus Greiner, Vladan Vuletić and
            Michael J. Gullans — Harvard, MIT and collaborators.
          </p>
        </Defense>
      </>
    ),
  },
];
