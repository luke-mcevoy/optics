# Optics Studio — AGENTS.md

## Mission

Build a conversational optics learning and design tool in which an LLM agent
**drives a live, deterministic optics simulation** to teach, demonstrate, and
eventually design optical systems.

The core interaction: the user talks to the agent in natural language, and the
agent answers by *operating a simulated optical bench* — placing elements,
propagating beams, taking measurements, sweeping parameters — so that every
explanation is grounded in a running, inspectable simulation rather than prose.

The long-term goal is an agent that can take a scientific objective
("detect 1550 nm pulses with <100 ps timing resolution") and autonomously
design, simulate, and justify an optical system. The path there runs through
teaching: an agent that can *explain* an optical system by demonstrating it is
the same agent that can later *design* one.

---

## Primary User

The first user is a physics PhD rebuilding their optics intuition and using
the tool for real work. This has concrete consequences:

- Explanations must be correct at the graduate-physics level, not
  pop-science level. The user will catch hand-waving.
- Every displayed number must be traceable to its derivation.
- The tool is a **development and learning instrument first**, a business
  second. Do not sacrifice physics transparency for commercial features.

---

## The Core Loop: Agent Drives Simulation

The architecture centers on one loop, used in every mode:

```text
User message
    ↓
Agent reasons about intent
    ↓
Agent calls bench tools (build, modify, propagate, measure, sweep, plot)
    ↓
Deterministic physics kernel computes results
    ↓
Bench UI updates live; agent narrates, citing computed values
    ↓
User inspects, asks "why", or manipulates the bench directly
```

### Agent Tool Interface

The agent operates the bench exclusively through a typed tool API, e.g.:

```text
create_bench()
add_element(type, position, params)      # laser, lens, mirror, waveplate, PBS, fiber, detector, aperture...
set_parameter(element_id, param, value)
remove_element(element_id)
propagate()                              # recompute beam through the bench
measure(quantity, at)                    # waist, power, polarization state, coupling efficiency...
sweep(element_id, param, range) -> curve
optimize(objective, free_params)         # simple scalar optimization
explain(quantity)                        # return the symbolic derivation with current values substituted
```

This tool set is deliberately identical for the tutor and the future
autonomous designer. Teaching mode exercises and hardens the exact toolkit
design mode will need.

### The Grounding Rule

**The agent must not assert a quantitative claim it has not computed.**

If the agent says "coupling efficiency is about 78%", that number must come
from a `measure()` call against the kernel. If it cannot compute something,
it says so and states what model or data would be needed. This is the single
most important behavioral constraint in the product.

---

## Product Ramp

Build as a smooth ramp, not separate products. Each version strictly extends
the previous one's engine and tools.

### v1 — Demonstrator (current target)

The user asks conceptual or practical optics questions; the agent answers
with live, inspectable simulations.

Example prompts v1 must handle well:

- "How does a beam expander work? Show me."
- "Why is there an optimal focal length for coupling into single-mode fiber?"
- "What happens to a Gaussian beam focused by an f=50mm lens? Where's the waist?"
- "Show me how a quarter-wave plate turns linear into circular polarization."
- "What does a Michelson interferometer output look like as I scan one arm?"

### v2 — Tutor

The agent sets challenges ("get >80% coupling using parts from this list"),
checks the user's bench against goals, tracks which concepts have been
exercised, and resurfaces stale ones.

### v3 — Design Partner

The user states an objective; the agent proposes candidate architectures,
simulates them, measures whether they meet spec, iterates, and explains every
choice — the same loop as teaching, pointed at a goal instead of a question.

### v4 — Real Components and BOM

Bench elements bind to real commercial SKUs (Thorlabs, Edmund, Newport,
Hamamatsu, Excelitas) with verified specs and provenance. "Export this bench
as a BOM" becomes an output. Compatibility checks (wavelength vs coating,
aperture vs beam diameter, thread/mount interfaces, damage thresholds) run
against real part data.

Do not build v4 infrastructure before v1–v2 are genuinely useful.

---

## UX Vision

Chat beside a live optical bench.

```text
┌──────────────┬──────────────────────────────┬──────────────┐
│  Chat with   │   Live optical bench          │  Inspector    │
│  the agent   │   (2D, top-down)              │  panel        │
│              │                                │               │
│  user asks;  │   beam envelope w(z) drawn     │  equations    │
│  agent       │   live; elements draggable;    │  with actual  │
│  narrates    │   parameters on sliders        │  values;      │
│  and drives  │                                │  assumptions; │
│  the bench   │   plots appear inline          │  derivations  │
└──────────────┴──────────────────────────────┴──────────────┘
```

Non-negotiable interactions:

- **Click anything, see the physics.** Click a lens → its ABCD matrix and the
  q-parameter transform with current numbers. Click the beam → w(z), R(z),
  Gouy phase, intensity at that point.
- **Every number links to its derivation.** No bare assertions in the UI.
- **Direct manipulation.** The user can drag elements and move sliders
  themselves; the agent sees the updated bench state.
- **Live recompute.** Propagation updates at interactive speed as parameters
  change.

Desirable soon after v1:

- **Progressive fidelity toggle:** geometric rays ↔ Gaussian beams ↔ scalar
  diffraction ↔ polarization overlay, with visible disagreement between
  levels ("show me where ray optics lies").
- **Wiggle mode:** perturb tilt/decenter and watch the beam walk — alignment
  intuition training.

The bench UI matters here more than in a typical engineering tool: the
visualization *is* the product. But correctness still outranks polish.

---

## Physics Kernel

A deterministic, unit-tested library. The LLM never does arithmetic the
kernel can do.

### v1 scope

- **Units**: explicit units everywhere via a units library; never silently
  mix nm/μm/mm, mW/W, deg/rad, ps/ns.
- **Gaussian beams**: complex q parameter; w0, z_R = π w0²/λ, w(z), R(z),
  Gouy phase; M² as a parameter.
- **ABCD matrices**: free space, thin lens, curved mirror, flat interface,
  curved interface, thick lens as composition; q-parameter propagation
  q' = (Aq + B)/(Cq + D).
- **Polarization**: Jones vectors and matrices — linear polarizers,
  half/quarter-wave plates at arbitrary angle, PBS; degree of polarization
  and ellipse parameters for display.
- **Fiber coupling**: mode-overlap integral between the incident Gaussian
  and the fiber's fundamental mode (Gaussian approximation with MFD).
- **Power budget**: P_out = P_in × Π(transmission_i); losses per element.
- **Interference**: two-beam interference for Michelson/Mach-Zehnder;
  fringe visibility vs path difference, coherence-length parameter.
- **Apertures**: clear-aperture checks (beam diameter at element vs aperture,
  with a stated clipping criterion, e.g. 99% power ⇒ aperture ≥ πw/2·…
  — state the convention explicitly).
- **Diffraction-limited resolution**: d ≈ 0.61 λ / NA where relevant.

### Soon after v1

- **Scalar diffraction**: FFT-based angular-spectrum / Fresnel propagation
  for "real" wave optics — visible Airy rings, aperture diffraction,
  mode structure. Keep grids small enough for interactive use.
- **Timing/photon-counting mode**: jitter budgets σ_total² = Σ σ_i²
  (FWHM↔σ conversions handled correctly), dark counts, dead time, simple
  Monte Carlo click statistics / TCSPC histograms.

### Kernel rules

- Pure functions where possible; bench state in, results out.
- Every model documents its assumptions and validity range
  (paraxial, thin-lens, TEM00, scalar...), and the agent surfaces them.
- Strong unit tests against analytically known results (e.g. waist position
  for a focused Gaussian, quarter-wave plate at 45° yields circular
  polarization, mode-matched coupling → 100%).
- Numerically boring and correct beats clever and fragile.

---

## Design Philosophy (carried over and still binding)

### 1. The LLM Reasons; Deterministic Tools Verify

The model orchestrates and explains. The kernel computes. No generated
numbers presented as calculated ones.

### 2. Never Hide Assumptions

If information is missing, state the assumption explicitly, e.g.
"Assumption: TEM00 with M² = 1.1." Assumptions must be easy to change and
recompute.

### 3. Prefer Calculated Claims Over Generated Claims

Bad: "This lens should give excellent coupling."
Good: "With the current beam (w = 0.5 mm at the lens) and f = 11 mm, the
predicted waist is 5.5 μm vs the fiber MFD of 5.0 μm ⇒ computed overlap 96%."

### 4. Separate Facts, Calculations, and Recommendations

Every claim belongs to one of: user-provided fact, calculated result,
engineering heuristic, model recommendation, (later) catalog fact.
Track provenance where practical.

### 5. Human-in-the-Loop by Default

The tool assists; it does not certify designs as safe or experimentally
validated. Everything important is inspectable.

---

## Explanation Quality Bar

- Explanations layer from phenomenon → model → math → simulation, and the
  user chooses the depth. "Why?" should always have a next level down.
- `explain(quantity)` returns the symbolic relationship with current bench
  values substituted — ideally rendered math, not ASCII soup.
- When a simpler model breaks down (paraxial limit, thin-lens limit, ray vs
  wave), the agent should say so proactively when the bench enters that
  regime.

---

## Suggested Technical Stack

Do not overengineer. Interactivity is the binding constraint: propagation
must feel instant.

```text
Frontend / bench UI:
    React + TypeScript; SVG or canvas for the bench; a plotting lib for sweeps

Physics kernel:
    Python (NumPy/SciPy) behind FastAPI
    — OR TypeScript in-browser for the v1 Gaussian/Jones/ABCD math
      (it is simple enough), with Python reserved for FFT wave optics.
    Decide once, early, based on interactivity; do not maintain two kernels
    of the same physics.

Schemas / bench state:
    Typed, serializable bench description (elements, positions, parameters)
    — this is the contract between agent tools, kernel, and UI.

Agent:
    Lightweight orchestration; typed tool-calling against the bench API.
    No heavy multi-agent framework.

Testing:
    pytest / vitest for the kernel; golden tests for benchmark scenarios.
```

---

## Correctness Strategy

Correctness is layered. Each layer has its own verification technique, and
the techniques below are **required deliverables**, not nice-to-haves. A
kernel function or agent capability is not "done" until its checks exist.

### Layer 1 — Physics kernel: proven against analytic physics

Four complementary techniques, all automated in CI:

**1. Analytic golden tests.** Every kernel function is tested against
closed-form results derivable by hand. Examples that must exist:

- collimated Gaussian focused by a lens: waist position ≈ f,
  w0' ≈ λf/πw for w ≫ w0'
- quarter-wave plate at 45° to linear input ⇒ exactly circular polarization
- mode-matched beam ⇒ exactly 100% coupling efficiency
- thin-lens imaging condition reproduced by composed ABCD matrices
- fringe visibility = 1 for equal-intensity, fully coherent Michelson arms

**2. Property-based tests.** Invariants fuzzed over randomized
configurations:

- ABCD determinant = 1 (same-index endpoints)
- Jones matrices of lossless elements are unitary
- power never increases through a passive element
- beam parameter product w0·θ ≥ λ/π (M² ≥ 1)
- propagate(d1) ∘ propagate(d2) = propagate(d1 + d2)

**3. Cross-model consistency.** Independent physics models must agree in
shared validity regimes: the FFT angular-spectrum propagator must reproduce
the analytic Gaussian/ABCD results for Gaussian inputs; Gaussian results
must converge to geometric-optics results in the appropriate limit. When two
independent implementations of different mathematics agree, bugs must
conspire to hide.

**4. External cross-validation.** Spot-check representative scenarios
against established references (LightPipes, poppy, vendor Gaussian-beam
calculators, textbook worked examples — Siegman, Saleh & Teich). Done once
per model and recorded in the test suite as fixed golden cases.

The units layer is itself a correctness mechanism: with explicit units end
to end, nm/mm-class mistakes become type errors instead of wrong answers.

### Layer 2 — Agent: mechanically auditable

**Claim auditing (the most important automated test in the product).**
For every agent reply in the eval suite, extract each numeric claim in the
text and verify it matches — within tolerance — a value that actually
appeared in a `measure()`/`sweep()`/`explain()` tool result during that
turn. A number with no matching tool call is a grounding violation and
fails the eval. No human judgment required.

**Benchmark conversations as regression tests.** The v1 benchmark
conversations below run on every significant change: the agent must build a
physically sensible bench, tool calls must succeed, and final numbers must
match golden values for the scenario.

### Layer 3 — Explanations: anchored and reviewable

Prose correctness cannot be fully automated. Mitigations:

- The grounding rule bounds the damage: on-screen numbers are always
  kernel-truth, so a wrong narrative sits next to a correct simulation and
  is visibly falsifiable. The simulation is the arbiter.
- **Validity-range enforcement:** every kernel model declares its
  assumptions (paraxial, thin-lens, TEM00, scalar) and the kernel warns when
  the bench leaves the regime rather than silently extrapolating. Most
  "wrong explanations" are right physics applied outside its domain.
- **Cheap human review:** any suspect explanation must be one click away
  from its derivation and assumptions. Every error the user catches becomes
  a new eval case — the eval suite accumulates expert review over time.

### Honest limits

"Correct" means correct within the stated model. The paraxial waist can be
exactly 5.2 μm and reality still differ due to aberrations, dispersion, or
a non-TEM00 beam. That gap cannot be tested away — only declared, which is
why "never hide assumptions" is a correctness mechanism, not a courtesy.
When real component data arrives (v4), wrong/stale vendor specs become a
new failure mode; provenance with source URLs exists to contain it.

---

## Evaluation

A feature is useful only if it makes an explanation or design measurably
more correct or more understandable.

### v1 benchmark conversations

1. "Show me how a Gaussian beam focuses; where is the waist for f = 50 mm?"
2. "Build a 3× beam expander and show the output divergence."
3. "Why is fiber coupling so alignment-sensitive? Demonstrate."
4. "Turn linear polarization into circular; prove it's circular."
5. "Scan a Michelson arm and show me the fringes; what sets the visibility?"
6. "Focus 780 nm to a 20 μm waist with ≥50 mm working distance — is it possible, and with what f?"

For each: is the bench physically correct? Are the numbers verifiable
against hand calculation? Are assumptions visible? Does the explanation
survive a physicist's scrutiny? Does the demo actually load and run live?

---

## Safety / Reliability

Never imply a simulated system is guaranteed to work physically. Be
conservative around high-power lasers, UV, eye safety, and damage
thresholds; when real components appear (v4), flag anything requiring
qualified human review. Do not recommend defeating safety mechanisms.

---

## What NOT To Build Yet

- vendor catalog scraping or large component databases (v4 concern)
- BOM generation, pricing, procurement integrations
- autonomous hardware control, robotics
- full ray tracing / Zemax-class sequential design
- CAD-quality table layouts
- 3D rendering
- accounts, sharing, multi-user features
- elaborate multi-agent infrastructure

---

## Core Question

Every implementation decision should be evaluated against:

> Does this make the physics of an optical system more visible, more
> correct, and more interrogable for the person using it?

If not, it is probably not v1 work.

---

## North-Star Demo (v1)

The user types:

> "I've forgotten how fiber coupling really works. Teach me — show me why
> the focal length matters and how sensitive it is to misalignment."

The agent:

1. builds a minimal bench: collimated 780 nm beam → aspheric lens → SM fiber,
2. shows the focused spot against the fiber mode and computes the overlap,
3. sweeps focal length and plots coupling efficiency, identifying the optimum,
4. explains the mode-matching condition with the actual numbers substituted,
5. perturbs lateral alignment to show the sensitivity curve,
6. invites the user to grab the lens and try to beat 80% themselves,
7. states every assumption used (TEM00, Gaussian fiber mode, ideal AR coating).

If that conversation works end-to-end and every number is kernel-computed,
v1 has succeeded.
