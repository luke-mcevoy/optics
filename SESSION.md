# SESSION.md — AI handoff journal

## 2026-09-10 — defense: Foundations appendix complete + accuracy pass

**Done:** The seven Foundations pages now live under `#/foundations`: A qubit, physically; Inside the rubidium atom; What light does to an atom; Cooling and seeing atoms; Rydberg atoms; Entanglement and two-qubit gates; Why error correction can work at all. Physics modules `qubit`, `hyperfine`, `light`, `cooling`, `rydberg`, `twoqubit`, `qec` (plus shared `formulas` / orbitals) sit next to vitest files; the defense suite is 128 passing + 1 skipped paper-text check. Dotted `Term` links in the guide jump to `#/foundations/<slug>/<section>`. Accuracy pass over all seven pages found no numerical errors; the Raman board's caption now states its two-beam model explicitly (πΓ/2Δ per beam, πΓ/Δ total because Δ ≫ ω_hf), guarded in `light.test.ts`. Phenomenological (d-round) noise is a third ThresholdPlot mode, decoded in 2+1 D by exact MWPM (≤14 defects) or union-find (Delfosse–Nickerson) beyond — the greedy caveat is gone. Astra work remains parked on `astra/instrument-journey`, draft PR #1 (not for merge).

**Not done:** Mobile stacking for wide boards; a scripted sync to the standalone repo whose clone lives at `/tmp/neutral-atom-compute-visualizer`. The repo’s original Optics Studio mission in `AGENTS.md` — agent tool API, claim-auditing eval, benchmark conversations — is untouched.

---

## 2026-08-27 — Cursor agent (orchestration wrap-up)

**Done:** v1 core complete and committed on main: packages/kernel (80 tests),
packages/bench (16), packages/tools (7) — 103 tests green, typecheck clean.
Built by Claude Code (kernel implementation) and Codex (audit/fixes, bench,
tools), orchestrated from Cursor via the `ai` dispatcher.

**Infra notes for future sessions:**
- Fixed two dispatcher bugs in ~/Develop/Code/usage-tracker/dispatcher/launch.py
  (UNCOMMITTED there — review & commit): headless claude now gets
  --dangerously-skip-permissions; headless codex gets --sandbox workspace-write.
  Codex still cannot write .git (no commits) — orchestrator commits.
- Claude hit its MONTHLY spend cap (resets 12am ET) — the tracker only watches
  5h/7d windows, so routing picked claude while it was unusable. Possible
  tracker enhancement: detect the spend-limit error.
- Optics workspace marked trusted in ~/.claude.json.

**Next (not started):** bench UI (live w(z) rendering, click-to-inspect) and
LLM runtime wiring for @optics/tools TOOL_DESCRIPTORS — see AGENTS.md v1 UX.

Read this before starting work. Append a short dated entry after completing
significant work: what was done, key decisions, anything unresolved.
The project spec is `AGENTS.md` — it is binding.

---

## 2026-08-26 — Cursor agent (planning session)

**Done:**
- Wrote `AGENTS.md`: conversational optics learning tool. An LLM agent
  drives a live deterministic optics simulation (bench) via typed tools.
  Ramp: v1 Demonstrator → v2 Tutor → v3 Design partner → v4 real SKUs/BOM.
- Added Correctness Strategy (golden tests, property tests, cross-model
  consistency, agent claim-auditing) and Modular Architecture sections.
- `CLAUDE.md` is a one-line `@AGENTS.md` import so Claude Code shares the spec.

**Key decisions:**
- Components are data, not code: every element = declarative registry entry
  supplying `abcd / jones / transmission / aperture` traits. ONE generic
  `propagate()` fold; elements contain no propagation logic.
- Kernel language: TypeScript, in-browser, pure package (`packages/kernel`).
  FFT wave optics later may be Python/WASM but must not duplicate v1 physics.
- The bench schema (typed, serializable) is the single contract between
  agent tools, kernel, and UI.

**Unresolved / next:**
- Workstream 1 (in progress, dispatched via `ai`): repo scaffold +
  `packages/kernel` (units, Gaussian q, ABCD, Jones, overlap coupling,
  power budget) + golden and property tests. Verify by running the test
  suite before building anything on top.
- After kernel: bench schema + registry + propagate fold, then tools API,
  then UI.

## 2026-08-26 — Claude Code (workstream 1, attempt 1 — blocked, design only)

**Blocked:** headless run had no filesystem write permission; no files
created. Fixed afterwards by adding `.claude/settings.json` with allow
rules (Write/Edit/Bash for npm, git, node, etc.).

**Design decisions to carry into the implementation (binding unless a
good reason emerges):**
- **Units:** one branded type per *dimension*, stored SI internally
  (`Length` in m, `Power` in W, `Angle` in rad), unit-named constructors
  (`nm`, `mm`, `deg`) and readers (`toMm`, `toDeg`). Do NOT brand per
  unit (Mm vs Nm) — poisons internal arithmetic. Cross-dimension mixing
  stays a type error.
- **q-convention:** `1/q = 1/R − i·λ₀·M²/(π·n·w²)` (vacuum λ₀, local
  index n, M² folded in), with *unreduced* ABCD matrices. Flat interface
  `[[1,0],[0,n₁/n₂]]` then gives q′ = q·n₂/n₁ (w unchanged) — correct.
  Consequence: `w₀·θ = M²λ₀/(nπ)`, so the beam-quality property test is
  `w₀θ ≥ M²λ₀/(nπ)` (or restrict to n = 1), NOT `λ/π` blindly.
- **Coupling closed form** (exact for paraxial Gaussians at a common
  plane, arbitrary complex q, lateral offset x₀, tilt θ; k = 2πn/λ₀):
  `η = η₀ · exp(2·Re[b²/(4A) − i·k·x₀²/(2q₁)])` with
  `η₀ = 4·Im(1/q₁)·Im(1/q₂)/|1/q₁ − conj(1/q₂)|²`,
  `A = i·k/2·(1/q₁ − conj(1/q₂))`, `b = i·k·(x₀/q₁ + θ)`.
  Golden tests: reduces at common waists to
  `(2w₁w₂/(w₁²+w₂²))²·exp(−2x₀²/(w₁²+w₂²))·exp(−k²θ²w₁²w₂²/(2(w₁²+w₂²)))`,
  and for w₁ = w₂ = w to Marcuse's `exp(−x₀²/w²)` and `exp(−(πnwθ/λ)²)`;
  mode-matched ⇒ exactly 1. General complex q matters for the north-star
  demo (beam is not mode-matched during focal-length sweeps).
- 2026-08-26 19:18 — dispatched to claude: You are building workstream 1 of the Optics Studio project in this directory (/Users/lukemcevoy/Deve
- 2026-08-26 19:24 — dispatched to claude: You are building workstream 1 of the Optics Studio project in this directory (/Users/lukemcevoy/Deve
- 2026-08-26 19:30 — dispatched to claude: You are building workstream 1 of the Optics Studio project in this directory (/Users/lukemcevoy/Deve
- 2026-08-26 19:41 — dispatched to codex: You are continuing workstream 1 of the Optics Studio project in this directory (/Users/lukemcevoy/De
- 2026-08-26 19:44 — dispatched to codex: You are finishing workstream 1 of the Optics Studio project in this directory (/Users/lukemcevoy/Dev

## 2026-08-26 — Codex (workstream 1 completion)

**Done:** fixed the coupling test exponent parse error, added `power.test.ts`
with a hand-checked power budget golden and seeded passive-power property test,
and reran `npm run typecheck` plus `npm test` successfully.

**Key decisions:** tightened unit arithmetic with `NoInfer` so mixed dimensions
cannot pass through generic union inference; corrected two Gaussian test literals
to exact formula-derived values while preserving the authoritative 1064 nm,
w=1 mm, f=50 mm golden numbers.

**Unresolved / watch:** kernel workstream 1 is green; next work should build the
bench schema, declarative element registry, and generic propagation fold without
duplicating physics outside `packages/kernel`.
- 2026-08-26 19:47 — dispatched to codex: You are building workstream 2 of the Optics Studio project in this directory (/Users/lukemcevoy/Deve

## 2026-08-26 — Codex (workstream 2 bench package)

**Done:** created `packages/bench` with the serializable bench schema,
declarative element registry, generic propagation fold, measurements, sweep,
and 16 Vitest tests. Verified from repo root with `npm test` and
`npm run typecheck`; kernel remained untouched and its 80 tests still pass.

**Key decisions:** elements stay as trait data only; compound `beam_expander`
expands into primitive lenses before the same fold runs. Aperture checks use
the stated 2w Gaussian diameter convention: PASS <=70% filled, WARNING <=100%,
FAIL above clear aperture. Polarizing elements use Jones intensity loss in the
generic fold so power remains traceable without per-element propagation logic.

**Unresolved / watch:** package-lock was not regenerated because deps were
already installed and the task said not to run install unless required; a future
install may add the workspace package to the lockfile.
- 2026-08-26 19:55 — dispatched to codex: You are building workstream 3 (final core workstream) of the Optics Studio project in this directory

## 2026-08-26 — Codex (workstream 3 tools package)

**Done:** created `packages/tools` as a provider-agnostic pure TypeScript tool
layer over `@optics/bench` and `@optics/kernel`, exposing create/add/set/remove,
propagate, measure, sweep, explain, and `TOOL_DESCRIPTORS`. Added 7 Vitest
tests covering round-trip behavior, grounding against direct bench measurements,
purity, explanations, errors, and the north-star fiber-coupling sweep.

**Key decisions:** kept the package as a thin adapter with no LLM SDK or network
code; all numerical values come from bench/kernel calls with structured
provenance. `sweep` returns generic waist measurements for every point and adds
coupling efficiency when an SMF element is present, so non-fiber sweeps remain
usable.

**Unresolved / watch:** did not run `npm install`; package resolution for tests
and typecheck uses local aliases in `packages/tools`. A future install may add
the workspace package to `package-lock.json`.
- 2026-08-26 20:26 — dispatched to codex: You are building the v1 bench UI for the Optics Studio project in this directory (/Users/lukemcevoy/

## 2026-08-27 — Codex (v1 bench UI)

**Done:** replaced the placeholder UI with a three-pane React bench sandbox in
`packages/ui/src`: presets, editable element list/parameters, live SVG beam
envelope, selectable element glyphs, inspector panels, aperture status colors,
and focal-length sweep mini-plots. Verified with `npm run typecheck` and
`npm run build --workspace @optics/ui`.

**Key decisions:** kept the UI as a consumer of `@optics/tools` propagation,
measurement, sweep, and explanation calls so displayed physics numbers remain
grounded; added passive downstream observation planes to non-terminal presets
so the existing propagator emits enough samples to draw the post-lens beam.

**Unresolved / watch:** no browser/Playwright visual check was run because the
task explicitly said not to open a browser; future UI work should inspect the
rendered layout interactively.
- 2026-08-26 20:44 — dispatched to codex: UX-writing task for the Optics Studio UI in /Users/lukemcevoy/Develop/Code/optics. Read AGENTS.md an

## 2026-08-27 — Codex (UI plain-language pass)

**Done:** updated `packages/ui/src/App.tsx` and `styles.css` with the requested
plain-language header subtitle, preset captions, SVG axis/waist labels,
quantity glosses, assumption explainers, fiber sweep caption, and a
localStorage-backed dismissible intro card. Verified with `npm run typecheck`
and `npm run build --workspace @optics/ui`.

**Key decisions / watch:** kept changes entirely in the UI layer and left
kernel/bench/tools untouched; explanatory copy is muted and attached directly
to existing values so it adds context without hiding the computed numbers.
- 2026-08-31 21:25 — dispatched to cursor (composer-2.5): Implement Phase 1 (packages/agent tool-calling loop) of PLAN-AGENT-CHAT.md

## 2026-08-31 — Cursor agent (Phase 1: packages/agent)

**Done:** Added `@optics/agent` workspace package per PLAN-AGENT-CHAT.md Phase 1:
`BenchSession` executor (bench injection, compact propagate/sweep summaries, error
envelopes), `AGENT_TOOL_DEFINITIONS` JSON schemas (bench param omitted),
`runAgentTurn` provider-agnostic loop (12-call cap, typed events), `OllamaChatProvider`
(injected `fetchImpl`), and `SYSTEM_PROMPT` with grounding + SI-unit rules. Six
Vitest tests with fakes (no network). Root `npm run typecheck` and `npm test` green
(109 tests).

**Key decisions:** Mutating tools return compact bench summaries, not full bench JSON;
`sweep` truncated to 41 points with numeric measure maps; default Ollama model
`qwen2.5:7b-instruct`; `FetchFn` interface avoids DOM lib in agent package.

**Also:** Fixed missing `useRef` / `useFrame` imports in `packages/ui/src/lab/scene/Rays.tsx`
so root typecheck passes (pre-existing lab WIP, not Phase 1 scope).

**Unresolved / next:** Phase 2 — chat panel in UI, Vite `/ollama` proxy, wire
`BenchSession` to App bench state.
- 2026-08-31 21:28 — dispatched to cursor (composer-2.5): claim auditor + benchmark eval harness in packages/agent (AGENTS.md Layer 2)

## 2026-08-31 — Cursor agent (Layer 2: claim auditor + eval harness)

**Done:** Built AGENTS.md Layer 2 correctness tooling in `packages/agent` only:
`auditClaims()` (`src/audit.ts`) extracts numeric prose claims (scientific/plain,
ignores integers ≤12 and calendar years 1900–2099), matches against numeric leaves
in that turn's tool results within 2% rtol with SI unit scaling (10^k, k∈[−9,9])
and percent-as-fraction×100; `BENCHMARK_SCENARIOS` + `runScenarios()` execute
five v1 benchmark conversations expressible with current tools (f=50 mm focus,
3× expander, fiber-coupling sweep optimum, QWP@45° circular pol, mode-matched
coupling) with physics-derived goldens. Eight new Vitest tests; package
typecheck and test green (14 tests).

**Key decisions:** Year filter limited to 1900–2099 so nm wavelengths like 1064
are not dropped; Michelson fringe scan omitted (no interferometer elements yet);
scenario goldens hand-commented from kernel literals, verified by deterministic
`BenchSession` execution.

**Unresolved / next:** Wire `auditClaims` into `runAgentTurn` post-turn hook and
surface violations in UI; extend scenarios when Michelson / alignment-sensitivity
tools land.
- 2026-08-31 21:31 — dispatched to cursor (composer-2.5): GitHub Actions CI (typecheck + tests) for the monorepo

## 2026-08-31 — Cursor agent (GitHub Actions CI)

**Done:** Added `.github/workflows/ci.yml`: single job on `ubuntu-latest`, Node 22
with npm cache, `npm ci`, then typecheck + Vitest for `@optics/kernel`,
`@optics/bench`, `@optics/tools`, and `@optics/agent`. Triggers on push to
`main` and all pull requests.

**Key decisions:** Excluded `@optics/ui` — active lab WIP may not typecheck;
kernel/bench/tools/agent (109+ tests) cover AGENTS.md Layer 1 correctness.
Workspace names verified against each package's `name` field; no matrix.

**Unresolved / next:** Add `@optics/ui` to CI once lab WIP lands; consider a
separate UI build job later.
- 2026-08-31 21:36 — dispatched to cursor (composer-2.5): root README.md for the repo

## 2026-08-31 — Cursor agent (root README.md)

**Done:** Added root `README.md`: mission paragraph from AGENTS.md, current v1
status (kernel/bench/tools/agent with test counts, UI in active dev, chat panel
not wired), package table, quickstart (install, typecheck, per-workspace tests,
UI dev, Ollama + `runAgentTurn` example), grounding rule and claim auditor in
two sentences, pointer to AGENTS.md. Scoped to what exists; no badges/emojis.

**Unresolved / next:** Add a small CLI or script entry for live Ollama turns;
wire chat panel per PLAN-AGENT-CHAT.md Phase 2; mention README in CI or docs
index when UI stabilizes.

## 2026-08-31 — Cursor agent (neutral-atom defense site)

**Done:** Added `@optics/defense`, a standalone Vite/React walkthrough of
Bluvstein, Geim et al., Nature 649, 39–46 (2026). Fourteen defense chapters
with live boards for ⁸⁷Rb levels, Raman/Stark, Rydberg blockade, SLM Fourier
holography, AOD shuttling, the five-AWG pulse rack, zoned processor,
spin-to-position readout, surface-code loss/superchecks, transversal vs
surgery + T-synthesis, and constant-entropy teleportation. Numbers are
paper-cited or formula-computed. Typecheck and production build clean;
dev server on :5200.

**Key decisions:** Kept this out of `@optics/ui` so the optics bench is
untouched. Slider models that are not paper fits (C₆ scaling, SK spacing,
p^{(d+1)/2}) are labeled as such.

**Unresolved / next:** No in-browser interaction pass (no browser tools in
this session). Continuous-reload / waveform-streaming chapters not animated
beyond the 27-layer memory limit discussed in Methods.

## 2026-08-31 — Cursor agent (personal laboratory site)

**Done:** Added `@optics/site`, a Vite/React personal site for Luke McEvoy
that is the catalog and live bench for scientific visualizations. Four
boards run in-place: Gaussian focus and Jones QWP (numbers from
`@optics/kernel`), orbital Zeeman (μB CODATA), and a photon-starved KDE
sketch of the PI-MAE regime (explicitly not the paper’s network). The rest
of the work — Optics Studio, the neutral-atom defense, PI-MAE, Language
Globe, Travel Timeline, Single Photon Challenge, typewriter photographs —
is indexed as data in `src/data/works.ts`. Typecheck and production build
clean; dev server on :5300.

**Key decisions:** Kept the site as its own package so the optics bench and
defense walkthrough stay untouched. A new visualization is a registry row
plus, if it runs here, a `live` kind in `viz/Live.tsx`. Did not invent
affiliations or emails; GitHub and the 2024 Scientific Reports paper are
the only external identity links.

**Unresolved / next:** Larger instruments are catalogued, not embedded.
Hosting/domain not set. Bio is intentionally short pending a line from Luke.

## 2026-08-31 — Cursor agent (PhD page on the personal site)

**Done:** Added `/phd` to `@optics/site`: a four-act live visualization of the
dissertation "Physics-Informed Sparse Single Photon 3D Imaging" (Stevens,
2026). Boards: (I) Poisson photon budget with thesis operating points
(n̄ = 1.86×10⁻⁶ PI-MAE, 6×10⁻⁴ QPMS); (II) MEMS mask lab — random/Lissajous/
spiral keep sets with a live Gauss–Seidel solve of the Ch. 5 biharmonic
Δ²u = 0 on a synthetic depth scene, PSNR computed in-browser; (III) QPMS
time-frequency mode counting N = πBT/2, reproducing 25.9 dB with the thesis
one-mode rounding, plus the +3.0/+7.1 → 36 dB decomposition; (IV) VideoPIMAE
PSNR/SSIM vs masking (Tables 5.1/6.1) with the static PAT reference. Cited
numbers live in `src/data/thesis.ts` with table references; provenance
section separates thesis-quoted from live-computed values. Typecheck and
production build clean.

**Key decisions:** Thesis gets a dedicated route rather than a generic work
page (`Work.page` override added to the catalog schema). The mask-lab scene
is synthetic and labeled as such — no thesis LiDAR data is reproduced. QPMS
is explicitly credited as inherited platform work per the thesis's own scope
note.

**Unresolved / next:** Could add PAT occlusion-mask board (ToF histogram →
occlusion mask) as act V; thesis PDF figures not embedded (no rights review).

## 2026-08-31 — Cursor agent (real thesis figures from PhDThesisSandbox)

**Done:** Luke pointed at `/Users/lukemcevoy/Develop/PhDThesisSandbox` — the
dissertation working repo with rendered figures (`Thesis/figures/`, 131 files)
and the unified metrics CSVs (`Thesis/data/unified_summary.csv`). Verified
every number hardcoded in `src/data/thesis.ts` against the CSV: PAT 17.368 dB /
0.709 SSIM, biharmonic 16.951 dB, sparse input 10.49 dB, VideoPIMAE
17.538/15.926/14.095/11.621 dB and 0.578/0.482/0.403/0.258 SSIM — all match.
Embedded four real figures on `/phd` (downscaled with Pillow into
`packages/site/public/thesis/`): the Fig. 1.2 end-to-end pipeline strip
replaces the text pipeline at the top; Fig. 2.3 PI-MAE wooden-letters
reconstructions close Act II; Fig. 3.9 noise-budget decomposition closes
Act III; and the Ch. 6 bicycle strips (75/90/95/98%) swap live with the
masking selector inside the SpeedupCurve board — click 90% and see the
actual 90% reconstruction next to its curve point. New `Figure` component
with `fig-light` frame for white-background figures. Typecheck + build clean;
verified via headless-Chrome screenshots.

**Key decisions:** Figures are Luke's own dissertation output (his Overleaf
repo), so the earlier rights concern is resolved. Originals untouched;
site copies resized to ≤1700 px wide, 78–509 KB each. The unused `.pipeline`
CSS block was removed with the text strip it styled.

**Unresolved / next:** Sandbox also holds `Thesis/figures/anim-stills/`
(defense animation stills), `optical-recon-share/` (biharmonic notebooks +
optical data), and `VideoPIMAE/output/` (full per-scene frame sequences —
could become an actual playing depth-video loop on the page). CLEO 2025
poster PDF at the repo root could join the works catalog.

## 2026-08-31 — Cursor agent (professional CV from resume)

**Done:** Luke shared his Oct 2025 resume; made the site professional with it.
New `src/data/cv.ts` holds education (PhD Physics exp. May 2026 / MS ML 2023 /
BS CS 2022, all Stevens), six selected roles (Tesla, Stevens RA/TA, QCI, ASML,
Lenovo, CastlePoint) with trimmed resume bullets, all six publications with
DOIs, four skill groups, and awards. About page rebuilt as a full CV
(education / experience / publications / skills / awards / beyond-work) with
email, GitHub, LinkedIn, and a resume-PDF download (`public/Luke-McEvoy-Resume.pdf`).
Home hero lede now states real credentials (PhD candidate at Stevens, PI-MAE
inventor, previously Tesla/QCI/ASML). Site footer carries email + GitHub +
LinkedIn + resume on every page. Two truncated resume DOIs were resolved by
web search: SPIE Photonics Europe → 10.1117/12.3014641, CLEO 2025 →
10.1364/cleo_at.2025.aa133_5 (published title says "Single-Photon", used
that). Typecheck + build clean; About and Home verified via screenshots.

**Key decisions:** Phone number and "U.S. Citizen" line kept off the site
pages (they remain in the downloadable PDF). Bullets are trimmed for the web
but numerically verbatim from the resume — no embellishment. Publication
titles follow the published records, not resume shorthand.

**Unresolved / next:** LinkedIn/GitHub links assumed from resume; a headshot
or OG image would complete the professional presentation. Facebook/WW/RBC
roles left off the site (kept in PDF) to keep the experience list strong.

## 2026-08-31 — Cursor agent (tonight's projects catalogued + first deploy)

**Done:** Added four entries to `src/data/works.ts` for the projects built
tonight across other sessions: Orders of magnitude (`~/Develop/Code/scale`,
62-decade logarithmic zoom), Usage (`~/Develop/Code/usage-tracker`, the local
AI-subscription router that dispatched much of tonight's work), Dad's Wine
Journeys (`~/Develop/Code/WineTracker`, EXIF→Overpass vineyard globe), and the
Elder-law prospecting dashboard (`~/Develop/Code/elder-law`, Next.js). Catalog
now has 16 entries. Deployed: production build served by `vite preview` on
:5310 (with `preview.allowedHosts: true` in `vite.config.ts`) through a
Cloudflare quick tunnel. Verified all routes, the resume PDF, and thesis
figures return 200 publicly; screenshot-checked the live /work page.

**Key decisions:** No hosting CLI is authenticated on this machine (no
Vercel/Netlify/Wrangler, gh logged out), so a quick tunnel is the deploy —
same pattern the typewriter app used tonight. The tunnel binary runs as
`/tmp/cf-optics-site` because another agent session pkills `cloudflared` by
name when restarting its own tunnel (killed the first two attempts). Tunnel
uses `--protocol http2` after a QUIC connection died.

**Unresolved / next:** The trycloudflare URL is ephemeral — it changes on
restart and dies if the Mac sleeps. Permanent hosting needs one login:
Cloudflare Pages, Netlify, Vercel, or GitHub Pages would all serve
`packages/site/dist` as-is (SPA fallback needed for /phd, /work/*, /about).

## 2026-08-31 — Cursor agent (newspaper redesign)

**Done:** Reskinned `@optics/site` as a broadsheet. Palette flipped from dark
to newsprint (#f5efe3 paper, near-black ink, newspaper red #8f2411 accent,
hairline #c9bfa9 rules) by redefining the existing CSS variables — components
untouched (--cream is now the strongest ink, --amber the red). Body type is
Newsreader (serif); Instrument Serif stays for display; IBM Plex Mono for
data. Nav rebuilt as a masthead: dateline rule (New York, N.Y. · motto ·
today's date), centered title, sticky section bar with a double rule.
Section heads, thesis acts, CV sections, and the footer (now a colophon) use
3px double rules. Ledes are italic; .prose is justified with hyphens; figure
captions are italic serif. Live canvas boards keep their dark internals and
read as framed plates — no canvas code changed. Typecheck + build clean;
home, /phd, /about screenshot-verified; the tunnel picked up the rebuilt
dist automatically.

**Key decisions:** Theme flip done entirely through CSS variable
redefinition plus masthead markup — zero visualization component changes.
The dark plates on newsprint are intentional (photographic-plate look), not
a leftover.

**Unresolved / next:** Could push further with CSS multi-column index and
drop caps. The `fig-light` white figure frames could lose their padding now
that the page itself is light.

## 2026-08-31 — Cursor agent (QuEra MHS pilot added; home hero visual removed)

**Done:** Added Luke's QuEra Computing MHS work everywhere it belongs: a
lead Experience entry in `cv.ts` (Core Team, MHS Laser Stabilization Pilot,
2026 — Anthropic's Model Hardware Standard lets AI agents run physical
experiments; lock recovery 58% → 99.3%, recovery time ~150 s → ~6 s, 700
blind trials), a featured work entry (`/work/mhs-quera`, "Teaching an AI to
hold a laser lock") with links to QuEra's "Holding the Light" post and
Anthropic's MHS research preview (both resolved from lnkd.in shorteners to
canonical URLs), and mentions in the Home and About ledes. Removed the
BeamFocus hero canvas from the home page per Luke's request — the front
page now goes straight from the lede to the story list. Typecheck + build
clean; home, /work/mhs-quera, and /about screenshot-verified; tunnel
serving the new bundle.

**Key decisions:** No place shown for the QuEra role (resume didn't state
one; About renders dates-only when place is empty). All MHS numbers are
verbatim from Luke's wording — nothing embellished. The focus/beam board
still exists at /work/focus; only the home-hero instance was removed.

**Unresolved / next:** If the QuEra pilot has dates more specific than
"2026", the CV entry can be tightened. `.github/workflows/pages.yml`
appeared in the repo (not authored in this session) — a permanent Pages
deploy may be in progress elsewhere.

**Addendum:** Luke confirmed the PhD is completed — "candidate / expected
May 2026" replaced with "PhD (May 2026)" on Home, About, and in `cv.ts`.
The downloadable resume PDF still says "Expected" (his Oct 2025 file; only
he can supply an updated one). The Stevens RA/TA entry still reads
"Jan 2023 – present" pending word on whether that role ended.

## 2026-08-31 — Cursor agent (static instruments embedded under the site)

**Done:** Luke asked why catalog entries don't link to deployed apps — they
weren't deployed. Four static Vite apps now build into subpaths of the site
and ship with it: the neutral-atom defense walkthrough at `/defense/`
(packages/defense, `--base=/defense/`), Orders of magnitude at `/orders/`
(~/Develop/Code/scale), Optics Studio at `/studio/` (packages/ui), and
Dad's Wine Journeys at `/wine/` (~/Develop/Code/WineTracker). Built dists
are copied into `packages/site/public/<name>/` so every site rebuild
includes them. Catalog entries got `status: 'live'` and "Open the …" links;
`Work.tsx` link rendering now distinguishes SPA routes (no trailing slash)
from embedded apps (trailing slash → real page load). All four verified 200
and screenshot-rendered through the public tunnel.

**Key decisions:** Embedded copies are build artifacts committed only into
`public/` (site serves them); the source repos stay where they are. Apps
that need a backend (Language Globe, Travel Timeline, typewriter, Usage,
elder-law) are not embeddable this way and keep catalog-only entries.

**Unresolved / next:** The `public/` copies are snapshots — rebuilding a
source app requires re-copying (a small build script could automate the
four `vite build --base` + `cp` steps). Wine Journeys dist is 7.8 MB
(demo photos).

## 2026-08-31 — Cursor agent (3D bench upgrade + deploy)

**Done:** Replaced generic optic primitives with distinct lab models (lens
tube, QWP/HWP plates, wire-grid polarizer, PBS hypotenuse, iris blades,
fiber ferrule). Added table z-ruler, kernel-backed Jones ellipse at the
probe, layer/camera HUD, and example IV (quarter-wave plate). Typecheck
and Vite production build clean. Pushed GitHub Pages workflow
(`.github/workflows/pages.yml`, `VITE_BASE=/optics/`).

**Unresolved / next:** Permanent host needs GitHub Pages enabled
(Settings → Pages → Source: GitHub Actions) or a Cloudflare API token
for `wrangler pages deploy`. Quick tunnel is ephemeral.

## 2026-09-01 — Cursor agent (commit wrap-up)

**Done:** Documented `@optics/site` and `@optics/defense` in the root README
and `packages/site/README.md`. Site, defense walkthrough, CV/thesis data,
embedded snapshots under `public/{defense,orders,studio,wine}`, and
`set_position` on `@optics/tools` prepared for commit and push. GitHub
Pages workflow still deploys `@optics/ui` to `/optics/`, not the personal
site — personal site is the Vite app on :5300.

**Unresolved / next:** Point Pages at `@optics/site` if that should be the
public homepage; refresh `public/` snapshots after rebuilding source apps.
